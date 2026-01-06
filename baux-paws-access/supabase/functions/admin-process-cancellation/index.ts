/**
 * Admin Process Cancellation Edge Function
 * 
 * PROTECTED endpoint - only for admin use (requires service role key)
 * 
 * Allows admin to approve/reject cancellation requests
 * 
 * Flow:
 * - Verify request exists and is pending
 * - If APPROVE: update booking status to 'cancelled' (triggers availability restore)
 * - If REJECT: just update request status
 * - Update cancellation_request with processed info
 * - Send email to customer with outcome
 * - Send email to provider with notification
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCancellationRequest {
  requestId: string;
  action: 'approve' | 'reject';
  adminEmail: string;
  adminNotes?: string;
  refundAmount?: number; // Optional: for tracking refund info
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] === ADMIN PROCESS CANCELLATION ===`);

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth headers
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('apikey');
    
    // Check if we have a Bearer token (could be service role or user access token)
    const hasAuth = authHeader && authHeader.includes('Bearer');
    
    if (!hasAuth && (!apiKeyHeader || apiKeyHeader.length < 20)) {
      console.error(`[${requestId}] Unauthorized - authentication required`);
      return new Response(
        JSON.stringify({
          error: 'unauthorized',
          message: 'This endpoint requires authentication.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Always use service role for database operations (we'll verify permissions separately)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // If using access token (not service role), verify user permissions
    let userEmail: string | null = null;
    let userId: string | null = null;
    let isServiceRole = false;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // Check if it's service role key (longer than typical JWT)
      isServiceRole = token.length > 200;
      
      if (!isServiceRole) {
        // It's a user access token - verify user
        try {
          const userClient = createClient(supabaseUrl, token);
          const { data: { user }, error: userError } = await userClient.auth.getUser();
          
          if (userError || !user) {
            console.error(`[${requestId}] Invalid user token:`, userError);
            return new Response(
              JSON.stringify({
                error: 'unauthorized',
                message: 'Invalid authentication token.',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
          }
          
          userEmail = user.email || null;
          userId = user.id;
          console.log(`[${requestId}] Authenticated user: ${userEmail} (${userId})`);
        } catch (error) {
          console.error(`[${requestId}] Error verifying user token:`, error);
          return new Response(
            JSON.stringify({
              error: 'unauthorized',
              message: 'Failed to verify authentication.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }
      } else {
        // Service role - allow all operations
        console.log(`[${requestId}] Using service role key`);
      }
    }

    // Parse request
    const body: ProcessCancellationRequest = await req.json();
    console.log(`[${requestId}] Action: ${body.action} by ${body.adminEmail}`);

    if (!body.requestId || !body.action || !body.adminEmail) {
      return new Response(
        JSON.stringify({
          error: 'missing_fields',
          message: 'requestId, action, and adminEmail are required.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (body.action !== 'approve' && body.action !== 'reject') {
      return new Response(
        JSON.stringify({
          error: 'invalid_action',
          message: 'action must be "approve" or "reject".',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get cancellation request with booking details
    const { data: cancellationRequest, error: fetchError } = await supabase
      .from('cancellation_request')
      .select(`
        *,
        booking:booking_id (
          id,
          order_number,
          customer_email,
          customer_name,
          customer_surname,
          customer_phone,
          product_type,
          product_id,
          product_name,
          booking_date,
          trip_end_date,
          booking_time,
          number_of_adults,
          number_of_dogs,
          total_amount_paid,
          currency,
          status,
          provider_id
        )
      `)
      .eq('id', body.requestId)
      .single();

    if (fetchError || !cancellationRequest) {
      console.error(`[${requestId}] Request not found:`, fetchError);
      return new Response(
        JSON.stringify({
          error: 'request_not_found',
          message: 'Cancellation request not found.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if already processed
    if (cancellationRequest.status !== 'pending') {
      console.log(`[${requestId}] Request already processed: ${cancellationRequest.status}`);
      return new Response(
        JSON.stringify({
          error: 'already_processed',
          message: `Request already ${cancellationRequest.status}.`,
          currentStatus: cancellationRequest.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const booking = cancellationRequest.booking as any;

    // Verify permissions: user must be admin or provider of this booking
    if (!isServiceRole && userId) {
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_role')
        .select('user_id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      const isAdmin = !!adminRole;
      
      // If not admin, check if user is provider of this booking
      if (!isAdmin) {
        const { data: provider } = await supabase
          .from('profile')
          .select('id, email')
          .eq('id', booking.provider_id)
          .eq('id', userId)
          .single();
        
        if (!provider) {
          console.error(`[${requestId}] User ${userEmail} is not authorized to process this request`);
          return new Response(
            JSON.stringify({
              error: 'forbidden',
              message: 'Non hai i permessi per processare questa richiesta. Solo admin o provider del booking possono processarla.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
        
        console.log(`[${requestId}] ✅ User ${userEmail} authorized as provider`);
      } else {
        console.log(`[${requestId}] ✅ User ${userEmail} authorized as admin`);
      }
    }

    // If APPROVE: cancel the booking
    if (body.action === 'approve') {
      console.log(`[${requestId}] Approving cancellation - updating booking status`);
      
      // Update booking status to cancelled
      // This will trigger the availability restore via database triggers
      const { error: updateBookingError } = await supabase
        .from('booking')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateBookingError) {
        console.error(`[${requestId}] Failed to update booking:`, updateBookingError);
        return new Response(
          JSON.stringify({
            error: 'booking_update_failed',
            message: 'Failed to cancel booking.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`[${requestId}] ✅ Booking cancelled: ${booking.id}`);
    }

    // Update cancellation request
    const { error: updateRequestError } = await supabase
      .from('cancellation_request')
      .update({
        status: body.action === 'approve' ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: body.adminEmail,
        admin_notes: body.adminNotes || null,
        metadata: {
          ...cancellationRequest.metadata,
          refund_amount: body.refundAmount,
          processed_timestamp: new Date().toISOString(),
        },
      })
      .eq('id', body.requestId);

    if (updateRequestError) {
      console.error(`[${requestId}] Failed to update request:`, updateRequestError);
      // Don't fail - booking is already cancelled if approved
    }

    console.log(`[${requestId}] ✅ Cancellation request ${body.action}d`);

    // Send email to customer
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
          type: body.action === 'approve' 
            ? 'cancellation_approved_customer' 
            : 'cancellation_rejected_customer',
          requestId: body.requestId,
          bookingId: booking.id,
          adminNotes: body.adminNotes,
        }),
      });

      if (!emailResponse.ok) {
        console.error(`[${requestId}] Failed to send customer email:`, await emailResponse.text());
      } else {
        console.log(`[${requestId}] ✅ Customer notification email sent`);
      }
    } catch (emailError) {
      console.error(`[${requestId}] Error sending customer email:`, emailError);
    }

    // If approved, send email to provider
    if (body.action === 'approve' && booking.provider_id) {
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
            type: 'cancellation_approved_provider',
            bookingId: booking.id,
            providerId: booking.provider_id,
          }),
        });

        if (!emailResponse.ok) {
          console.error(`[${requestId}] Failed to send provider email:`, await emailResponse.text());
        } else {
          console.log(`[${requestId}] ✅ Provider notification email sent`);
        }
      } catch (emailError) {
        console.error(`[${requestId}] Error sending provider email:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cancellation request ${body.action}d successfully.`,
        requestId: body.requestId,
        bookingId: booking.id,
        action: body.action,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: 'Internal server error.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

