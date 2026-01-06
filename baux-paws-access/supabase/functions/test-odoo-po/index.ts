/**
 * Test Script for Odoo Purchase Order Integration
 * 
 * This script tests the PO creation logic with existing bookings:
 * - Reads bookings from database
 * - Groups them by product + provider
 * - Creates/updates POs in Odoo
 * - Verifies grouping logic (1 PO = 1 Product + 1 Supplier + N Bookings)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
} from '../_shared/odoo/index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from '../_shared/odoo/bookingMapper.ts';

interface TestResult {
  success: boolean;
  bookingId: string;
  productId: string;
  providerId: string;
  poId?: number;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

interface GroupingResult {
  productId: string;
  providerId: string;
  productName: string;
  providerName: string;
  bookingCount: number;
  poId?: number;
  bookings: Array<{
    bookingId: string;
    customerEmail: string;
    providerCostTotal: number;
  }>;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Test Odoo PO] ========================================');
    console.log('[Test Odoo PO] Starting test with existing bookings');
    console.log('[Test Odoo PO] ========================================');

    // 1. Get Odoo configuration
    const config = getActiveOdooConfig();
    if (!config || !validateOdooConfig(config)) {
      throw new Error('Odoo configuration not available. Please set OD_URL, OD_DB_NAME, OD_LOGIN, OD_API_KEY');
    }
    console.log('[Test Odoo PO] ✅ Odoo configuration loaded');

    // 2. Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[Test Odoo PO] ✅ Supabase client created');

    // 3. Parse request parameters
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 10; // Default: test with 10 bookings
    const productId = body.productId || null; // Optional: filter by product
    const providerId = body.providerId || null; // Optional: filter by provider
    const dryRun = body.dryRun !== false; // Default: dry run (no actual PO creation)

    console.log('[Test Odoo PO] Test parameters:', {
      limit,
      productId,
      providerId,
      dryRun,
    });

    // 4. Fetch bookings with financial data
    console.log('[Test Odoo PO] Fetching bookings from database...');
    let bookingsQuery = supabase
      .from('booking')
      .select(`
        id,
        order_number,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        customer_email,
        customer_name,
        customer_surname,
        customer_phone,
        customer_fiscal_code,
        customer_address,
        product_type,
        availability_slot_id,
        product_name,
        product_description,
        provider_id,
        booking_date,
        booking_time,
        number_of_adults,
        number_of_dogs,
        total_amount_paid,
        currency,
        provider_cost_total,
        stripe_fee,
        internal_margin,
        net_revenue,
        trip_start_date,
        trip_end_date
      `)
      .not('provider_cost_total', 'is', null) // Only bookings with provider_cost_total
      .gt('provider_cost_total', 0) // Only bookings with valid cost
      .order('created_at', { ascending: false })
      .limit(limit);

    // Note: product_id is not in booking table, it's in availability_slot
    // Filtering by product will be done after fetching availability_slot data
    if (providerId) {
      bookingsQuery = bookingsQuery.eq('provider_id', providerId);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No bookings found with provider_cost_total > 0',
          results: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Test Odoo PO] Found ${bookings.length} bookings to process`);

    // 5. Recupera product_id da availability_slot
    console.log('[Test Odoo PO] Fetching product_id from availability_slot...');
    const availabilitySlotIds = bookings
      .map((b: any) => b.availability_slot_id)
      .filter(Boolean) as string[];

    const productIdMap = new Map<string, string>(); // Map: booking_id -> product_id

    if (availabilitySlotIds.length > 0) {
      const { data: slots } = await supabase
        .from('availability_slot')
        .select('id, product_id, product_type')
        .in('id', availabilitySlotIds);

      const slotToProductMap = new Map(
        (slots || []).map((s: any) => [s.id, s.product_id])
      );

      for (const booking of bookings) {
        if (booking.availability_slot_id && slotToProductMap.has(booking.availability_slot_id)) {
          productIdMap.set(booking.id, slotToProductMap.get(booking.availability_slot_id)!);
        }
      }
    }

    console.log(`[Test Odoo PO] Retrieved ${productIdMap.size} product_id from availability_slot`);

    // 6. Fetch provider and product data for all bookings
    const providerIds = [...new Set(bookings.map((b: any) => b.provider_id).filter(Boolean))];
    const productIds = [...new Set(Array.from(productIdMap.values()))];

    console.log(`[Test Odoo PO] Fetching ${providerIds.length} providers and ${productIds.length} products...`);

    // Fetch providers
    const { data: providers } = await supabase
      .from('profile')
      .select('id, company_name, contact_name, email, phone')
      .in('id', providerIds);

    const providersMap = new Map(
      (providers || []).map((p: any) => [p.id, p])
    );

    // Fetch products (from different tables based on type)
    // Raggruppa product_id per tipo per query più efficienti
    const productsByType = new Map<'experience' | 'class' | 'trip', string[]>();
    
    for (const booking of bookings) {
      const bookingProductId = productIdMap.get(booking.id);
      if (!bookingProductId || !booking.product_type) continue;
      
      if (!productsByType.has(booking.product_type)) {
        productsByType.set(booking.product_type, []);
      }
      const typeProducts = productsByType.get(booking.product_type)!;
      if (!typeProducts.includes(bookingProductId)) {
        typeProducts.push(bookingProductId);
      }
    }

    // Carica prodotti per tipo
    for (const [productType, typeProductIds] of productsByType.entries()) {
      if (typeProductIds.length === 0) continue;
      
      const tableName = productType === 'experience' ? 'experience' :
                       productType === 'class' ? 'class' : 'trip';
      
      const { data: products } = await supabase
        .from(tableName)
        .select('id, name, description')
        .in('id', typeProductIds);
      
      if (products) {
        for (const product of products) {
          productsMap.set(product.id, product);
        }
      }
    }
    
    // Apply product filter if specified (after fetching product_id from slots)
    if (productId) {
      // Filter bookings that have this product_id
      const filteredBookings = bookings.filter((b: any) => 
        productIdMap.get(b.id) === productId
      );
      if (filteredBookings.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `No bookings found for product ${productId}`,
            results: [],
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      // Note: We'll continue with all bookings but filter in grouping step
    }

    console.log(`[Test Odoo PO] ✅ Loaded ${providersMap.size} providers and ${productsMap.size} products`);

    // 7. Group bookings by product + provider
    console.log('[Test Odoo PO] Grouping bookings by product + provider...');
    const groupingMap = new Map<string, GroupingResult>();

    for (const booking of bookings) {
      if (!booking.provider_id) {
        console.warn(`[Test Odoo PO] Skipping booking ${booking.id}: missing provider_id`);
        continue;
      }

      const productId = productIdMap.get(booking.id);
      if (!productId) {
        console.warn(`[Test Odoo PO] Skipping booking ${booking.id}: missing product_id (no availability_slot)`);
        continue;
      }

      const key = `${productId}::${booking.provider_id}`;
      
      if (!groupingMap.has(key)) {
        const provider = providersMap.get(booking.provider_id);
        const product = productsMap.get(productId);
        
        groupingMap.set(key, {
          productId: productId,
          providerId: booking.provider_id,
          productName: product?.name || booking.product_name || 'Unknown Product',
          providerName: provider?.company_name || 'Unknown Provider',
          bookingCount: 0,
          bookings: [],
        });
      }

      const group = groupingMap.get(key)!;
      group.bookingCount++;
      group.bookings.push({
        bookingId: booking.id,
        customerEmail: booking.customer_email,
        providerCostTotal: booking.provider_cost_total,
      });
    }

    console.log(`[Test Odoo PO] ✅ Grouped into ${groupingMap.size} groups (POs)`);

    // 8. Process each group (create/update PO)
    const results: TestResult[] = [];
    const groupingResults: GroupingResult[] = [];

    for (const [key, group] of groupingMap.entries()) {
      console.log(`[Test Odoo PO] Processing group: ${group.productName} - ${group.providerName} (${group.bookingCount} bookings)`);
      
      // Process first booking to create/get PO
      const firstBooking = bookings.find((b: any) => {
        const bookingProductId = productIdMap.get(b.id);
        return bookingProductId === group.productId && b.provider_id === group.providerId;
      });

      if (!firstBooking) {
        console.warn(`[Test Odoo PO] No booking found for group ${group.productName} - ${group.providerName}`);
        continue;
      }

      const provider = providersMap.get(group.providerId);
      const product = productsMap.get(group.productId);

      // Aggiungi product_id al booking per il mapper
      const firstBookingWithProductId = {
        ...firstBooking,
        product_id: group.productId,
      };

      const bookingData = mapBookingToOdoo(firstBookingWithProductId, provider, product);

      // Validate booking data
      const validationErrors = validateBookingDataForOdoo(bookingData);
      if (validationErrors.length > 0) {
        console.error(`[Test Odoo PO] Validation errors for booking ${firstBooking.id}:`, validationErrors);
        results.push({
          success: false,
          bookingId: firstBooking.id,
          productId: group.productId,
          providerId: group.providerId,
          action: 'error',
          error: `Validation failed: ${validationErrors.join(', ')}`,
        });
        continue;
      }

      if (dryRun) {
        console.log(`[Test Odoo PO] [DRY RUN] Would create/update PO for: ${group.productName}`);
        groupingResults.push({
          ...group,
          poId: undefined,
        });
        continue;
      }

      // Create/update PO
      try {
        const poResult = await createOdooPurchaseOrder(config, bookingData);
        
        if (poResult.success && poResult.purchaseOrderId) {
          group.poId = poResult.purchaseOrderId;
          console.log(`[Test Odoo PO] ✅ PO ${poResult.purchaseOrderId} created/updated for first booking`);
          
          results.push({
            success: true,
            bookingId: firstBooking.id,
            productId: group.productId,
            providerId: group.providerId,
            poId: poResult.purchaseOrderId,
            action: 'created',
          });

          // Process remaining bookings in this group (add lines to same PO)
          const remainingBookings = bookings.filter((b: any) => {
            const bookingProductId = productIdMap.get(b.id);
            return bookingProductId === group.productId &&
                   b.provider_id === group.providerId &&
                   b.id !== firstBooking.id;
          });

          for (const booking of remainingBookings) {
            const remainingProvider = providersMap.get(booking.provider_id);
            const remainingProduct = productsMap.get(group.productId);
            
            // Aggiungi product_id al booking per il mapper
            const remainingBookingWithProductId = {
              ...booking,
              product_id: group.productId,
            };
            
            const remainingBookingData = mapBookingToOdoo(remainingBookingWithProductId, remainingProvider, remainingProduct);

            const remainingValidationErrors = validateBookingDataForOdoo(remainingBookingData);
            if (remainingValidationErrors.length > 0) {
              console.warn(`[Test Odoo PO] Validation errors for booking ${booking.id}, skipping:`, remainingValidationErrors);
              results.push({
                success: false,
                bookingId: booking.id,
                productId: group.productId,
                providerId: group.providerId,
                action: 'skipped',
                error: `Validation failed: ${remainingValidationErrors.join(', ')}`,
              });
              continue;
            }

            try {
              const remainingPoResult = await createOdooPurchaseOrder(config, remainingBookingData);
              
              if (remainingPoResult.success) {
                console.log(`[Test Odoo PO] ✅ Line added to PO ${remainingPoResult.purchaseOrderId} for booking ${booking.id}`);
                results.push({
                  success: true,
                  bookingId: booking.id,
                  productId: group.productId,
                  providerId: group.providerId,
                  poId: remainingPoResult.purchaseOrderId,
                  action: 'updated',
                });
              } else {
                throw new Error(remainingPoResult.error || 'Unknown error');
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`[Test Odoo PO] Error adding line for booking ${booking.id}:`, errorMessage);
              results.push({
                success: false,
                bookingId: booking.id,
                productId: group.productId,
                providerId: group.providerId,
                action: 'error',
                error: errorMessage,
              });
            }
          }
        } else {
          throw new Error(poResult.error || 'PO creation failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Test Odoo PO] Error creating PO for group:`, errorMessage);
        results.push({
          success: false,
          bookingId: firstBooking.id,
          productId: group.productId,
          providerId: group.providerId,
          action: 'error',
          error: errorMessage,
        });
      }

      groupingResults.push(group);
    }

    // 9. Verify grouping logic
    console.log('[Test Odoo PO] Verifying grouping logic...');
    const verificationResults: Record<string, any> = {
      totalBookings: bookings.length,
      totalGroups: groupingMap.size,
      expectedPOs: groupingMap.size,
      actualPOs: groupingResults.filter(g => g.poId).length,
      successfulBookings: results.filter(r => r.success).length,
      failedBookings: results.filter(r => !r.success).length,
    };

    // Check that bookings with same product+provider have same PO ID
    const poIdByGroup = new Map<string, number>();
    for (const result of results) {
      if (result.success && result.poId) {
        const key = `${result.productId}::${result.providerId}`;
        if (!poIdByGroup.has(key)) {
          poIdByGroup.set(key, result.poId);
        } else {
          const existingPoId = poIdByGroup.get(key)!;
          if (existingPoId !== result.poId) {
            console.error(`[Test Odoo PO] ❌ Grouping error: Bookings in same group have different PO IDs!`);
            console.error(`[Test Odoo PO]   Group: ${key}`);
            console.error(`[Test Odoo PO]   Expected PO: ${existingPoId}, Got: ${result.poId}`);
            verificationResults.groupingErrors = (verificationResults.groupingErrors || 0) + 1;
          }
        }
      }
    }

    console.log('[Test Odoo PO] ========================================');
    console.log('[Test Odoo PO] Test Summary:');
    console.log('[Test Odoo PO]', JSON.stringify(verificationResults, null, 2));
    console.log('[Test Odoo PO] ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: verificationResults,
        grouping: groupingResults,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Test Odoo PO] ========================================');
    console.error('[Test Odoo PO] ❌ Test failed');
    console.error('[Test Odoo PO] Error:', errorMessage);
    console.error('[Test Odoo PO] Stack:', errorStack);
    console.error('[Test Odoo PO] ========================================');

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stack: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

