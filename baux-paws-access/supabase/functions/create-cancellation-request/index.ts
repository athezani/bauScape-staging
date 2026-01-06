/**
 * Create Cancellation Request Edge Function
 * 
 * PUBLIC endpoint - allows customers to request booking cancellation
 * 
 * Two modes:
 * 1. Magic link: token-based (pre-filled from email link)
 * 2. Manual: order_number + email + name (fallback for lost emails)
 * 
 * Flow:
 * - Validate input (token OR manual data)
 * - Verify booking exists and matches customer data
 * - Check token not expired (24h after trip end)
 * - Create cancellation_request record
 * - Send email to admin with all details (policy, dates, booking info)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  generateCancellationToken,
  validateCancellationToken,
  isTokenExpired,
  getTokenId,
} from '../_shared/cancellation-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCancellationRequest {
  // Magic link mode
  token?: string;
  
  // Manual mode (fallback)
  orderNumber?: string;
  customerEmail?: string;
  customerName?: string;
  
  // Optional
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] === CREATE CANCELLATION REQUEST ===`);

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tokenSecret = Deno.env.get('CANCELLATION_TOKEN_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: CreateCancellationRequest = await req.json();
    console.log(`[${requestId}] Request mode:`, body.token ? 'magic-link' : 'manual');

    let bookingId: string;
    let orderNumber: string;
    let customerEmail: string;
    let customerName: string;

    // MODE 1: Token-based (magic link)
    if (body.token) {
      console.log(`[${requestId}] Validating token: ${getTokenId(body.token)}`);
      
      const validation = await validateCancellationToken(body.token, tokenSecret);
      if (!validation.valid || !validation.payload) {
        console.error(`[${requestId}] Invalid token:`, validation.error);
        return new Response(
          JSON.stringify({
            error: 'invalid_token',
            message: 'Il link di cancellazione non è valido o è stato manomesso.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      bookingId = validation.payload.bookingId;
      orderNumber = validation.payload.orderNumber;
      customerEmail = validation.payload.email;
      
      // Get booking to verify and get customer name
      const { data: booking, error: bookingError } = await supabase
        .from('booking')
        .select('id, order_number, customer_email, customer_name, booking_date, trip_end_date, status')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error(`[${requestId}] Booking not found:`, bookingError);
        return new Response(
          JSON.stringify({
            error: 'booking_not_found',
            message: 'Prenotazione non trovata.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Verify token data matches booking
      if (booking.order_number !== orderNumber || booking.customer_email.toLowerCase() !== customerEmail.toLowerCase()) {
        console.error(`[${requestId}] Token data mismatch`);
        return new Response(
          JSON.stringify({
            error: 'token_mismatch',
            message: 'I dati del token non corrispondono alla prenotazione.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if token is expired
      if (isTokenExpired(booking.booking_date, booking.trip_end_date)) {
        console.log(`[${requestId}] Token expired - booking date passed`);
        return new Response(
          JSON.stringify({
            error: 'token_expired',
            message: 'Il link di cancellazione è scaduto (valido fino a 24h dopo la data dell\'esperienza).',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check booking status
      if (booking.status === 'cancelled') {
        console.log(`[${requestId}] Booking already cancelled`);
        return new Response(
          JSON.stringify({
            error: 'already_cancelled',
            message: 'Questa prenotazione è già stata cancellata.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      customerName = booking.customer_name;
    }
    // MODE 2: Manual (fallback)
    else if (body.orderNumber && body.customerEmail && body.customerName) {
      console.log(`[${requestId}] Manual mode - order: ${body.orderNumber}`);
      
      orderNumber = body.orderNumber.toUpperCase().replace('#', '');
      customerEmail = body.customerEmail.toLowerCase();
      customerName = body.customerName;

      // Find booking by order number and email (case-insensitive)
      const { data: booking, error: bookingError } = await supabase
        .from('booking')
        .select('id, order_number, customer_email, customer_name, booking_date, trip_end_date, status')
        .eq('order_number', orderNumber)
        .ilike('customer_email', customerEmail)
        .single();

      if (bookingError || !booking) {
        console.error(`[${requestId}] Booking not found with order/email`);
        return new Response(
          JSON.stringify({
            error: 'booking_not_found',
            message: 'Prenotazione non trovata. Verifica numero ordine ed email.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Verify name matches (fuzzy match - case insensitive, trim whitespace)
      const normalizedInputName = customerName.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalizedBookingName = booking.customer_name.toLowerCase().trim().replace(/\s+/g, ' ');
      
      if (normalizedInputName !== normalizedBookingName) {
        console.error(`[${requestId}] Name mismatch: "${normalizedInputName}" vs "${normalizedBookingName}"`);
        return new Response(
          JSON.stringify({
            error: 'validation_failed',
            message: 'Il nome non corrisponde alla prenotazione.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if expired
      if (isTokenExpired(booking.booking_date, booking.end_date)) {
        console.log(`[${requestId}] Request expired - booking date passed`);
        return new Response(
          JSON.stringify({
            error: 'request_expired',
            message: 'Non è più possibile richiedere la cancellazione (oltre 24h dalla data dell\'esperienza).',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check booking status
      if (booking.status === 'cancelled') {
        console.log(`[${requestId}] Booking already cancelled`);
        return new Response(
          JSON.stringify({
            error: 'already_cancelled',
            message: 'Questa prenotazione è già stata cancellata.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      bookingId = booking.id;
    } else {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({
          error: 'missing_fields',
          message: 'Dati mancanti. Fornire token oppure numero ordine, email e nome.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if there's already a pending request for this booking
    const { data: existingRequest } = await supabase
      .from('cancellation_request')
      .select('id, status, requested_at')
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        console.log(`[${requestId}] Request already exists - returning existing`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Richiesta di cancellazione già inviata. Riceverai risposta via email.',
            requestId: existingRequest.id,
            alreadyExists: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else if (existingRequest.status === 'approved') {
        console.log(`[${requestId}] Cancellation already approved`);
        return new Response(
          JSON.stringify({
            error: 'already_approved',
            message: 'La cancellazione è già stata approvata.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Generate a new token for this request (if not already provided)
    const cancellationToken = body.token || await generateCancellationToken(
      bookingId,
      orderNumber,
      customerEmail,
      tokenSecret
    );

    // Create cancellation request
    const { data: request, error: createError } = await supabase
      .from('cancellation_request')
      .insert({
        booking_id: bookingId,
        cancellation_token: cancellationToken,
        order_number: orderNumber,
        customer_email: customerEmail,
        customer_name: customerName,
        reason: body.reason || null,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !request) {
      console.error(`[${requestId}] Failed to create request:`, createError);
      return new Response(
        JSON.stringify({
          error: 'creation_failed',
          message: 'Errore durante la creazione della richiesta.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[${requestId}] ✅ Cancellation request created: ${request.id}`);

    // Send email to admin
    try {
      const emailFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-transactional-email`;
      const emailResponse = await fetch(emailFunctionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          type: 'cancellation_request_admin',
          requestId: request.id,
          bookingId: bookingId,
        }),
      });

      if (!emailResponse.ok) {
        console.error(`[${requestId}] Failed to send admin email:`, await emailResponse.text());
        // Don't fail the request - admin will get daily reminders
      } else {
        console.log(`[${requestId}] ✅ Admin notification email sent`);
      }
    } catch (emailError) {
      console.error(`[${requestId}] Error sending admin email:`, emailError);
      // Don't fail the request
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Richiesta di cancellazione inviata con successo. Riceverai risposta via email entro 3 giorni.',
        requestId: request.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: 'Errore interno del server.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

