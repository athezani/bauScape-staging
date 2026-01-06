/**
 * Check Pending Cancellations Cron Function
 * 
 * CRON job - runs daily to remind admin of pending cancellation requests
 * 
 * Schedule: Every day at 09:00 UTC (10:00 CET, 11:00 CEST)
 * 
 * Flow:
 * - Find all pending cancellation requests
 * - Group by age (0-1 day, 1-3 days, 3+ days)
 * - Send reminder email to admin if there are pending requests
 * - Mark urgent if >3 days old
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingRequestSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  productName: string;
  requestedAt: string;
  daysOld: number;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] === CHECK PENDING CANCELLATIONS (CRON) ===`);

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending cancellation requests
    const { data: requests, error: fetchError } = await supabase
      .from('cancellation_request')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        requested_at,
        reason,
        booking:booking_id (
          id,
          booking_date,
          trip_end_date,
          product_name,
          product_type,
          number_of_adults,
          number_of_dogs
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (fetchError) {
      console.error(`[${requestId}] Failed to fetch requests:`, fetchError);
      return new Response(
        JSON.stringify({
          error: 'fetch_failed',
          message: 'Failed to fetch pending requests.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      console.log(`[${requestId}] ✅ No pending cancellation requests`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending cancellation requests.',
          count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[${requestId}] Found ${requests.length} pending request(s)`);

    // Calculate age and categorize
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const pendingRequests: PendingRequestSummary[] = requests.map(req => {
      const requestedAt = new Date(req.requested_at);
      const ageMs = now.getTime() - requestedAt.getTime();
      const daysOld = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      const booking = req.booking as any;

      return {
        id: req.id,
        orderNumber: req.order_number,
        customerName: req.customer_name,
        customerEmail: req.customer_email,
        bookingDate: booking.booking_date,
        productName: booking.product_name,
        requestedAt: req.requested_at,
        daysOld,
        reason: req.reason,
      };
    });

    // Separate urgent (>3 days) from recent
    const urgentRequests = pendingRequests.filter(r => r.daysOld >= 3);
    const recentRequests = pendingRequests.filter(r => r.daysOld < 3);

    console.log(`[${requestId}] Urgent: ${urgentRequests.length}, Recent: ${recentRequests.length}`);

    // Send reminder email to admin only if there are requests
    if (pendingRequests.length > 0) {
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
            type: 'cancellation_reminder_admin',
            totalCount: pendingRequests.length,
            urgentCount: urgentRequests.length,
            recentCount: recentRequests.length,
            urgentRequests,
            recentRequests,
          }),
        });

        if (!emailResponse.ok) {
          console.error(`[${requestId}] Failed to send reminder email:`, await emailResponse.text());
        } else {
          console.log(`[${requestId}] ✅ Reminder email sent to admin`);
        }
      } catch (emailError) {
        console.error(`[${requestId}] Error sending reminder email:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Found ${pendingRequests.length} pending request(s).`,
        totalCount: pendingRequests.length,
        urgentCount: urgentRequests.length,
        recentCount: recentRequests.length,
        urgentRequests: urgentRequests.map(r => ({
          id: r.id,
          orderNumber: r.orderNumber,
          daysOld: r.daysOld,
        })),
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

