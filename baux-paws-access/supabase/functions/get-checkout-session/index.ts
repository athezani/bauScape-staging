/**
 * Supabase Edge Function: Get Checkout Session Details
 * 
 * Retrieves checkout session details from Stripe to display on ThankYou page
 * This allows instant display without waiting for webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPaymentProvider } from '../_shared/payment/providerFactory.ts';
import type { NormalizedCheckoutSession } from '../_shared/payment/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only GET is supported.' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Get session ID from query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const paymentGateway = url.searchParams.get('payment_gateway') as 'stripe' | null;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'session_id parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session via gateway-agnostic provider
    const provider = getPaymentProvider({ gateway: paymentGateway, checkoutSessionId: sessionId });
    const raw = await provider.getCheckoutSession({ checkoutSessionId: sessionId });
    const session: NormalizedCheckoutSession = provider.normalizeCheckoutSession(raw);

    // Extract metadata
    const metadata = session.metadata || {};
    const productId = metadata.product_id;
    const productType = metadata.product_type as 'experience' | 'class' | 'trip';

    if (!productId || !productType) {
      return new Response(
        JSON.stringify({ error: 'Session metadata missing product information' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch product details from database
    const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
    const { data: product, error: productError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Load program if exists
    let productProgram: { days: Array<{ id: string; day_number: number; introduction: string | null; items: Array<{ id: string; activity_text: string; order_index: number }> }> } | null = null;
    try {
      const { data: programDays, error: programError } = await supabase
        .from('trip_program_day')
        .select(`
          id,
          day_number,
          introduction,
          trip_program_item (
            id,
            activity_text,
            order_index
          )
        `)
        .eq('product_id', productId)
        .eq('product_type', productType)
        .order('day_number', { ascending: true });
      
      if (!programError && programDays && programDays.length > 0) {
        productProgram = {
          days: programDays.map((day: any) => ({
            id: day.id,
            day_number: day.day_number,
            introduction: day.introduction || null,
            items: (day.trip_program_item || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((item: any) => ({
                id: item.id,
                activity_text: item.activity_text,
                order_index: item.order_index,
              })),
          })),
        };
      }
    } catch (programErr) {
      console.log('get-checkout-session: Error loading program (non-blocking):', programErr);
      // Non-blocking: continue without program
    }

    // Debug: log product data to verify what we're getting from database
    console.log('get-checkout-session: Product data from database', {
      productId: product.id,
      hasDescription: !!product.description,
      hasHighlights: !!product.highlights,
      highlightsValue: product.highlights,
      highlightsLength: Array.isArray(product.highlights) ? product.highlights.length : 'not array',
      hasIncludedItems: !!product.included_items,
      includedItemsValue: product.included_items,
      includedItemsLength: Array.isArray(product.included_items) ? product.included_items.length : 'not array',
      hasExcludedItems: !!product.excluded_items,
      excludedItemsValue: product.excluded_items,
      excludedItemsLength: Array.isArray(product.excluded_items) ? product.excluded_items.length : 'not array',
      hasMeetingInfo: !!product.meeting_info,
      meetingInfoValue: product.meeting_info,
      hasCancellationPolicy: !!product.cancellation_policy,
      cancellationPolicyValue: product.cancellation_policy,
      hasProgram: !!productProgram,
      programDaysCount: productProgram?.days?.length || 0,
    });

    // Extract customer information (normalized)
    const customerEmail = session.customer.email || '';
    const customerPhone = session.customer.phone || null;
    const fullCustomerName =
      (`${session.customer.firstName || ''} ${session.customer.lastName || ''}`.trim()) ||
      session.customer.name ||
      'Cliente';

    // Prepare response
    const response = {
      sessionId: session.checkoutSessionId,
      paymentGateway: session.gateway,
      paymentStatus: session.paymentStatus,
      customerEmail,
      customerName: fullCustomerName,
      customerPhone,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        type: productType,
        images: product.images || [],
        price_adult_base: product.price_adult_base || 0,
        price_dog_base: product.price_dog_base || 0,
        no_adults: product.no_adults || false,
        highlights: product.highlights || [],
        included_items: product.included_items || [],
        excluded_items: product.excluded_items || [],
        meeting_info: product.meeting_info || null,
        show_meeting_info: product.show_meeting_info || false,
        cancellation_policy: product.cancellation_policy || null,
        attributes: product.attributes || [],
        location: productType === 'trip' ? (product as any).location : (product as any).meeting_point || null,
        duration_hours: productType !== 'trip' ? (product as any).duration_hours : null,
        duration_days: productType === 'trip' ? (product as any).duration_days : null,
        start_date: productType === 'trip' ? (product as any).start_date : null,
        end_date: productType === 'trip' ? (product as any).end_date : null,
        program: productProgram,
      },
      booking: {
        date: metadata.booking_date,
        time: metadata.booking_time || null,
        numberOfAdults: parseInt(metadata.number_of_adults || '1'),
        numberOfDogs: parseInt(metadata.number_of_dogs || '0'),
        totalAmount: parseFloat(metadata.total_amount || '0'),
        currency: session.currency || 'EUR',
      },
      amountTotal: session.amountTotal || 0,
      currency: session.currency || 'EUR',
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

