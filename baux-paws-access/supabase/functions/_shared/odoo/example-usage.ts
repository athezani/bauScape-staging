/**
 * Example Usage of Odoo Integration
 * 
 * This file demonstrates how to integrate Odoo functions into your booking flow.
 * This is a reference implementation - adapt it to your specific use case.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
  createOdooSalesInvoice,
} from './index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from './bookingMapper.ts';

/**
 * Example: Integrate Odoo after booking creation
 * 
 * This function should be called after a booking is successfully created
 * in your system (e.g., in create-booking Edge Function).
 */
export async function syncBookingToOdoo(bookingId: string): Promise<void> {
  // 1. Get Odoo configuration
  const config = getActiveOdooConfig();
  if (!config || !validateOdooConfig(config)) {
    console.warn('[Odoo Sync] Odoo configuration not available, skipping sync');
    return;
  }

  // 2. Get Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not set');
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Fetch booking data from Supabase
  const { data: booking, error: bookingError } = await supabase
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
      product_id,
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
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Failed to fetch booking: ${bookingError?.message || 'Not found'}`);
  }

  // 4. Fetch provider data (optional, for better provider name and complete info)
  let provider = null;
  if (booking.provider_id) {
    const { data: providerData } = await supabase
      .from('profile')
      .select('id, company_name, contact_name, email, phone')
      .eq('id', booking.provider_id)
      .single();
    provider = providerData;
  }

  // 5. Fetch product data (optional, for better product name)
  let product = null;
  if (booking.product_id && booking.product_type) {
    const tableName = booking.product_type === 'experience' ? 'experience' :
                     booking.product_type === 'class' ? 'class' : 'trip';
    const { data: productData } = await supabase
      .from(tableName)
      .select('id, name, description')
      .eq('id', booking.product_id)
      .single();
    product = productData;
  }

  // 6. Map to Odoo format
  const bookingData = mapBookingToOdoo(booking, provider, product);

  // 7. Validate data
  const validationErrors = validateBookingDataForOdoo(bookingData);
  if (validationErrors.length > 0) {
    throw new Error(`Booking data validation failed: ${validationErrors.join(', ')}`);
  }

  // 8. Create Purchase Order (if provider cost is available)
  if (bookingData.providerCostTotal !== null && bookingData.providerCostTotal > 0) {
    console.log('[Odoo Sync] Creating Purchase Order...');
    const poResult = await createOdooPurchaseOrder(config, bookingData);
    
    if (poResult.success) {
      console.log('[Odoo Sync] Purchase Order created:', poResult.purchaseOrderId);
      
      // Optionally: Store PO ID in booking record
      // await supabase
      //   .from('booking')
      //   .update({ odoo_purchase_order_id: poResult.purchaseOrderId })
      //   .eq('id', bookingId);
    } else {
      console.error('[Odoo Sync] Purchase Order creation failed:', poResult.error);
      // Decide: throw error or continue with invoice?
      // For now, we'll log and continue
    }
  } else {
    console.warn('[Odoo Sync] Skipping Purchase Order (provider_cost_total is null or 0)');
  }

  // 9. Create Sales Invoice
  console.log('[Odoo Sync] Creating Sales Invoice...');
  const invoiceResult = await createOdooSalesInvoice(config, bookingData);
  
  if (invoiceResult.success) {
    console.log('[Odoo Sync] Sales Invoice created:', invoiceResult.invoiceId);
    
    // Optionally: Store Invoice ID in booking record
    // await supabase
    //   .from('booking')
    //   .update({ odoo_sales_invoice_id: invoiceResult.invoiceId })
    //   .eq('id', bookingId);
  } else {
    console.error('[Odoo Sync] Sales Invoice creation failed:', invoiceResult.error);
    // Decide: throw error or log and continue?
    throw new Error(`Failed to create Sales Invoice: ${invoiceResult.error}`);
  }

  console.log('[Odoo Sync] Booking synced to Odoo successfully');
}

/**
 * Example: Call from create-booking Edge Function
 * 
 * Add this to your create-booking function after successful booking creation:
 * 
 * ```typescript
 * // After booking is created successfully
 * try {
 *   await syncBookingToOdoo(bookingResult.booking_id);
 * } catch (error) {
 *   // Log error but don't fail the booking creation
 *   console.error('Odoo sync failed (non-blocking):', error);
 * }
 * ```
 */

