/**
 * Sync Products to Odoo
 * 
 * Edge Function to synchronize products from Supabase to Odoo.
 * 
 * This function can be called:
 * 1. Without parameters: syncs all active products (batch mode)
 * 2. With productId and productType: syncs a single product
 * 
 * Usage:
 * - POST /sync-products-to-odoo (syncs all active products)
 * - POST /sync-products-to-odoo?productId=xxx&productType=experience (syncs single product)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getActiveOdooConfig, validateOdooConfig } from '../_shared/odoo/config.ts';
import { syncProductToOdoo, syncProductsBatchToOdoo, type ProductForOdooSync } from '../_shared/odoo/productSync.ts';

interface RequestBody {
  productId?: string;
  productType?: 'class' | 'experience' | 'trip';
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log('[Sync Products] ========================================');
  console.log('[Sync Products] Request started:', requestId);
  console.log('[Sync Products] Method:', req.method);
  console.log('[Sync Products] URL:', req.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get Odoo configuration
    const odooConfig = getActiveOdooConfig();
    
    if (!odooConfig || !validateOdooConfig(odooConfig)) {
      console.error('[Sync Products] Odoo configuration not available or invalid');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Odoo configuration not available. Please check environment variables.',
          requestId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body or query parameters
    let requestBody: RequestBody = {};
    try {
      const url = new URL(req.url);
      const productId = url.searchParams.get('productId');
      const productType = url.searchParams.get('productType') as 'class' | 'experience' | 'trip' | null;
      
      if (productId || productType) {
        requestBody = { productId: productId || undefined, productType: productType || undefined };
      } else {
        const bodyText = await req.text();
        if (bodyText) {
          requestBody = JSON.parse(bodyText);
        }
      }
    } catch (parseError) {
      console.warn('[Sync Products] Could not parse request body, using empty object:', parseError);
    }

    // Determine sync mode
    if (requestBody.productId && requestBody.productType) {
      // Single product sync
      console.log('[Sync Products] Single product sync mode:', {
        productId: requestBody.productId,
        productType: requestBody.productType,
      });

      const product = await fetchProductFromSupabase(
        supabase,
        requestBody.productId,
        requestBody.productType
      );

      if (!product) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Product not found',
            productId: requestBody.productId,
            productType: requestBody.productType,
            requestId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      const result = await syncProductToOdoo(odooConfig, product);

      const duration = Date.now() - startTime;
      console.log('[Sync Products] Single product sync completed:', {
        requestId,
        duration: `${duration}ms`,
        result,
      });

      return new Response(
        JSON.stringify({
          success: result.success,
          result,
          requestId,
          duration: `${duration}ms`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500,
        }
      );
    } else {
      // Batch sync: all active products
      console.log('[Sync Products] Batch sync mode: syncing all active products');

      const products = await fetchAllActiveProducts(supabase);

      if (products.length === 0) {
        console.log('[Sync Products] No active products found');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No active products to sync',
            total: 0,
            requestId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      console.log('[Sync Products] Found', products.length, 'active products to sync');

      const batchResult = await syncProductsBatchToOdoo(odooConfig, products);

      const duration = Date.now() - startTime;
      console.log('[Sync Products] Batch sync completed:', {
        requestId,
        duration: `${duration}ms`,
        total: batchResult.total,
        successful: batchResult.successful,
        failed: batchResult.failed,
        skipped: batchResult.skipped,
      });

      return new Response(
        JSON.stringify({
          success: batchResult.failed === 0,
          batchResult,
          requestId,
          duration: `${duration}ms`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: batchResult.failed === 0 ? 200 : 207, // 207 Multi-Status if some failed
        }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Sync Products] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
        requestId,
        duration: `${duration}ms`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Fetch a single product from Supabase
 */
async function fetchProductFromSupabase(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  productType: 'class' | 'experience' | 'trip'
): Promise<ProductForOdooSync | null> {
  const tableName = productType === 'experience' ? 'experience' :
                   productType === 'class' ? 'class' : 'trip';

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      name,
      description,
      active,
      max_adults,
      max_dogs,
      duration_hours,
      duration_days,
      meeting_point,
      location
    `)
    .eq('id', productId)
    .single();

  if (error || !data) {
    console.error('[Sync Products] Error fetching product:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    type: productType,
    active: data.active ?? true,
    maxAdults: data.max_adults,
    maxDogs: data.max_dogs,
    durationHours: data.duration_hours,
    durationDays: data.duration_days,
    meetingPoint: data.meeting_point,
    location: data.location,
  };
}

/**
 * Fetch all active products from Supabase
 */
async function fetchAllActiveProducts(
  supabase: ReturnType<typeof createClient>
): Promise<ProductForOdooSync[]> {
  const products: ProductForOdooSync[] = [];

  // Fetch experiences
  const { data: experiences, error: experiencesError } = await supabase
    .from('experience')
    .select(`
      id,
      name,
      description,
      active,
      max_adults,
      max_dogs,
      duration_hours,
      meeting_point
    `)
    .eq('active', true);

  if (experiencesError) {
    console.error('[Sync Products] Error fetching experiences:', experiencesError);
  } else if (experiences) {
    for (const exp of experiences) {
      products.push({
        id: exp.id,
        name: exp.name,
        description: exp.description,
        type: 'experience',
        active: exp.active ?? true,
        maxAdults: exp.max_adults,
        maxDogs: exp.max_dogs,
        durationHours: exp.duration_hours,
        meetingPoint: exp.meeting_point,
      });
    }
  }

  // Fetch classes
  const { data: classes, error: classesError } = await supabase
    .from('class')
    .select(`
      id,
      name,
      description,
      active,
      max_adults,
      max_dogs,
      duration_hours,
      meeting_point
    `)
    .eq('active', true);

  if (classesError) {
    console.error('[Sync Products] Error fetching classes:', classesError);
  } else if (classes) {
    for (const cls of classes) {
      products.push({
        id: cls.id,
        name: cls.name,
        description: cls.description,
        type: 'class',
        active: cls.active ?? true,
        maxAdults: cls.max_adults,
        maxDogs: cls.max_dogs,
        durationHours: cls.duration_hours,
        meetingPoint: cls.meeting_point,
      });
    }
  }

  // Fetch trips
  const { data: trips, error: tripsError } = await supabase
    .from('trip')
    .select(`
      id,
      name,
      description,
      active,
      max_adults,
      max_dogs,
      duration_days,
      location
    `)
    .eq('active', true);

  if (tripsError) {
    console.error('[Sync Products] Error fetching trips:', tripsError);
  } else if (trips) {
    for (const trip of trips) {
      products.push({
        id: trip.id,
        name: trip.name,
        description: trip.description,
        type: 'trip',
        active: trip.active ?? true,
        maxAdults: trip.max_adults,
        maxDogs: trip.max_dogs,
        durationDays: trip.duration_days,
        location: trip.location,
      });
    }
  }

  console.log('[Sync Products] Fetched products:', {
    experiences: experiences?.length || 0,
    classes: classes?.length || 0,
    trips: trips?.length || 0,
    total: products.length,
  });

  return products;
}

