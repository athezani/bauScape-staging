/**
 * Temporary Edge Function to search Stripe for a session ending with a specific order number
 * and create the booking if found
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FindSessionRequest {
  orderNumber: string; // Last 8 chars of session ID
  limit?: number; // Number of recent sessions to search (default: 200)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is supported.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { orderNumber, limit = 200 }: FindSessionRequest = await req.json();

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: 'orderNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderNumberUpper = orderNumber.toUpperCase();
    console.log(`Searching Stripe for sessions ending with: ${orderNumberUpper}`);

    // Search Stripe for recent checkout sessions
    const searchLimit = Math.min(limit, 500); // Stripe max is 100 per page, but we can paginate
    let foundSession: any = null;
    let hasMore = true;
    let startingAfter: string | null = null;
    let searched = 0;

    while (hasMore && searched < searchLimit && !foundSession) {
      const url = startingAfter
        ? `https://api.stripe.com/v1/checkout/sessions?limit=100&starting_after=${startingAfter}`
        : `https://api.stripe.com/v1/checkout/sessions?limit=100`;

      const stripeResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      });

      if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text();
        throw new Error(`Stripe API error: ${stripeResponse.status} - ${errorText}`);
      }

      const data = await stripeResponse.json();
      const sessions = data.data || [];
      searched += sessions.length;

      console.log(`Searched ${searched} sessions...`);

      // Find session ending with order number
      for (const session of sessions) {
        const sessionId = (session.id || '').toUpperCase();
        if (sessionId.endsWith(orderNumberUpper)) {
          foundSession = session;
          console.log(`✅ Found matching session: ${session.id}`);
          break;
        }
      }

      // Check if there are more pages
      hasMore = data.has_more === true;
      if (hasMore && sessions.length > 0) {
        startingAfter = sessions[sessions.length - 1].id;
      }
    }

    if (!foundSession) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `No session found ending with ${orderNumberUpper} in the last ${searched} sessions`,
          searched,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Now call ensure-booking to create the booking
    console.log(`Calling ensure-booking for session: ${foundSession.id}`);
    const ensureBookingUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ensure-booking`;
    const ensureResponse = await fetch(ensureBookingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({ sessionId: foundSession.id }),
    });

    const ensureResult = await ensureResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: foundSession.id,
        session: {
          id: foundSession.id,
          payment_status: foundSession.payment_status,
          customer_email: foundSession.customer_email,
          created: foundSession.created,
        },
        ensureBookingResult: ensureResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



