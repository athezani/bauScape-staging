/**
 * Supabase Edge Function: Ensure Booking Exists
 *
 * Gateway-agnostic wrapper used by Thank You page as a fallback if the webhook
 * hasn't created the booking yet.
 *
 * Flow:
 * 1. Check if booking already exists (created by webhook)
 * 2. If not, call create-booking (single source of truth)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EnsureBookingRequest {
  sessionId: string;
  paymentGateway?: 'stripe';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, paymentGateway }: EnsureBookingRequest = await req.json();
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Check if booking already exists
    const { data: existingBooking, error: checkError } = await supabase
      .from('booking')
      .select('id, customer_email, created_at, confirmation_email_sent, availability_slot_id')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to check existing booking: ${checkError.message}`);
    }

    if (existingBooking) {
      // Step 1.5: Check if email was sent, and send it if not
      if (!existingBooking.confirmation_email_sent) {
        console.log('[ensure-booking] Email not sent for existing booking, sending now...');
        try {
          // Fetch full booking data for email
          const { data: fullBooking, error: fetchError } = await supabase
            .from('booking')
            .select('*')
            .eq('id', existingBooking.id)
            .single();

          if (!fetchError && fullBooking) {
            // Get product data (no_adults flag and additional info for email)
            const tableName = fullBooking.product_type === 'class' ? 'class' : fullBooking.product_type === 'experience' ? 'experience' : 'trip';
            let productNoAdults = false;
            let productIncludedItems: string[] | undefined = undefined;
            let productExcludedItems: string[] | undefined = undefined;
            let productMeetingInfo: { text: string; googleMapsLink: string } | undefined = undefined;
            let productShowMeetingInfo: boolean = false;
            let productCancellationPolicy: string | undefined = undefined;
            let productTime: string | undefined = undefined; // Time from product (full_day_start_time/end_time), not from booking slot
            let productProgram: {
              days: Array<{
                day_number: number;
                introduction?: string | null;
                items: Array<{
                  activity_text: string;
                  order_index: number;
                }>;
              }>;
            } | undefined = undefined;
            
            // Try to get product_id from slot or booking
            const productId = slot?.product_id || fullBooking.product_id;
            
            // CRITICAL: Get product data from database including name and description
            // This ensures email shows current product info, not outdated booking info
            let productName: string | undefined = undefined;
            let productDescription: string | undefined = undefined;
            
            if (productId) {
              const { data: product } = await supabase
                .from(tableName)
                .select('name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time')
                .eq('id', productId)
                .single();

              if (product) {
                // CRITICAL: Use product data from database
                productName = (product as any).name;
                productDescription = (product as any).description || undefined;
                productNoAdults = (product as any).no_adults === true || (product as any).no_adults === 1;
                productIncludedItems = Array.isArray((product as any).included_items) 
                  ? (product as any).included_items 
                  : undefined;
                productExcludedItems = Array.isArray((product as any).excluded_items) 
                  ? (product as any).excluded_items 
                  : undefined;
                
                // Parse meeting_info
                if ((product as any).meeting_info && typeof (product as any).meeting_info === 'object') {
                  const meetingInfo = (product as any).meeting_info;
                  productMeetingInfo = {
                    text: meetingInfo.text || '',
                    googleMapsLink: meetingInfo.google_maps_link || '',
                  };
                  productShowMeetingInfo = (product as any).show_meeting_info === true || (product as any).show_meeting_info === 1;
                }
                
                productCancellationPolicy = (product as any).cancellation_policy || undefined;
                
                // Log cancellation policy for debugging
                console.log('[ensure-booking] Product cancellation policy retrieved:', {
                  productId,
                  productName: (product as any).name,
                  cancellationPolicy: productCancellationPolicy,
                  cancellationPolicyLength: productCancellationPolicy?.length || 0,
                  rawValue: (product as any).cancellation_policy,
                });
              }
              
              // Get product time (full_day_start_time/end_time) - only show if present in product
              if (product) {
                const formatTimeForDisplay = (timeStr: string | null | undefined): string => {
                  if (!timeStr) return '';
                  const timeParts = timeStr.split(':');
                  if (timeParts.length >= 2) {
                    const hours = timeParts[0].padStart(2, '0');
                    const minutes = timeParts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                  }
                  return timeStr;
                };
                
                const productStartTime = (product as any).full_day_start_time;
                const productEndTime = (product as any).full_day_end_time;
                
                if (productStartTime) {
                  const formattedStartTime = formatTimeForDisplay(productStartTime);
                  if (productEndTime) {
                    const formattedEndTime = formatTimeForDisplay(productEndTime);
                    productTime = `${formattedStartTime} - ${formattedEndTime}`;
                  } else {
                    productTime = formattedStartTime;
                  }
                }
                
                console.log('[ensure-booking] Product time retrieved:', {
                  productId,
                  productName: (product as any).name,
                  full_day_start_time: productStartTime,
                  full_day_end_time: productEndTime,
                  formattedProductTime: productTime,
                });
              }
              
              // Load program if exists
              try {
                const { data: programDays, error: programError } = await supabase
                  .from('trip_program_day')
                  .select(`
                    day_number,
                    introduction,
                    trip_program_item (
                      activity_text,
                      order_index
                    )
                  `)
                  .eq('product_id', productId)
                  .eq('product_type', fullBooking.product_type)
                  .order('day_number', { ascending: true });
                
                if (!programError && programDays && programDays.length > 0) {
                  productProgram = {
                    days: programDays.map((day: any) => ({
                      day_number: day.day_number,
                      introduction: day.introduction || null,
                      items: (day.trip_program_item || [])
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((item: any) => ({
                          activity_text: item.activity_text,
                          order_index: item.order_index,
                        })),
                    })),
                  };
                }
              } catch (programErr) {
                console.log('[ensure-booking] Error loading program (non-blocking):', programErr);
                // Non-blocking: continue without program
              }
            }

            // Helper function to format order number
            const formatOrderNumber = (sessionId: string): string => {
              return sessionId.slice(-8).toUpperCase();
            };

            const emailFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-transactional-email`;
            
            // CRITICAL: Use product data from database, not from booking table
            // The booking table may have outdated product info if product was updated after booking
            const emailPayload = {
              type: 'order_confirmation',
              bookingId: fullBooking.id,
              customerEmail: fullBooking.customer_email,
              customerName: fullBooking.customer_name,
              customerSurname: fullBooking.customer_surname || undefined,
              customerPhone: fullBooking.customer_phone || undefined,
              productName: productName || fullBooking.product_name, // FROM DATABASE if available
              productDescription: productDescription || fullBooking.product_description || undefined, // FROM DATABASE if available
              productType: fullBooking.product_type,
              bookingDate: fullBooking.booking_date,
              bookingTime: productTime || undefined, // Only use product time (full_day_start_time/end_time), never booking slot time
              numberOfAdults: fullBooking.number_of_adults,
              numberOfDogs: fullBooking.number_of_dogs,
              totalAmount: fullBooking.total_amount_paid,
              currency: fullBooking.currency,
              orderNumber: formatOrderNumber(fullBooking.stripe_checkout_session_id),
              noAdults: productNoAdults,
              // New fields for email content - ALL FROM DATABASE
              // CRITICAL: Always include all fields, even if undefined (convert to null for JSON serialization)
              includedItems: productIncludedItems ?? null,
              excludedItems: productExcludedItems ?? null,
              meetingInfo: productMeetingInfo ?? null,
              showMeetingInfo: productShowMeetingInfo ?? false,
              program: productProgram ?? null,
              cancellationPolicy: productCancellationPolicy ?? null, // Always include, even if undefined
            };
            
            // Log complete payload for verification
            console.log('[ensure-booking] Email payload prepared - VERIFY ALL DATA MATCHES PRODUCT DATABASE:', {
              productId: productId,
              productNameFromDB: productName,
              productNameInPayload: emailPayload.productName,
              productNameFromBooking: fullBooking.product_name,
              productDescriptionFromDB: productDescription,
              productDescriptionInPayload: emailPayload.productDescription,
              cancellationPolicyFromDB: productCancellationPolicy,
              cancellationPolicyInPayload: emailPayload.cancellationPolicy,
              cancellationPolicyInPayloadType: typeof emailPayload.cancellationPolicy,
              cancellationPolicyInPayloadLength: emailPayload.cancellationPolicy?.length || 0,
              cancellationPolicyIsUndefined: emailPayload.cancellationPolicy === undefined,
              cancellationPolicyIsNull: emailPayload.cancellationPolicy === null,
              cancellationPolicyIsEmptyString: emailPayload.cancellationPolicy === '',
              includedItemsCount: productIncludedItems?.length || 0,
              excludedItemsCount: productExcludedItems?.length || 0,
              hasMeetingInfo: !!productMeetingInfo,
              hasProgram: !!productProgram,
              // Verify critical fields
              productNameMatches: productName === emailPayload.productName,
              cancellationPolicyMatches: productCancellationPolicy === emailPayload.cancellationPolicy,
              // Verify all product data fields are present in payload (same check for all)
              allFieldsPresent: {
                includedItems: 'includedItems' in emailPayload,
                excludedItems: 'excludedItems' in emailPayload,
                meetingInfo: 'meetingInfo' in emailPayload,
                program: 'program' in emailPayload,
                cancellationPolicy: 'cancellationPolicy' in emailPayload, // CRITICAL: Must be present
              },
            });

            const emailResponse = await fetch(emailFunctionsUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
              },
              body: JSON.stringify(emailPayload),
            });

            if (emailResponse.ok) {
              // Mark as sent
              await supabase
                .from('booking')
                .update({ confirmation_email_sent: true })
                .eq('id', existingBooking.id);
              console.log('[ensure-booking] ✅ Email sent successfully for existing booking');
            } else {
              const errorText = await emailResponse.text();
              console.error('[ensure-booking] Email sending failed:', errorText);
            }
          } else {
            console.warn('[ensure-booking] Could not fetch full booking data for email:', fetchError);
          }
        } catch (emailError) {
          console.error('[ensure-booking] Error sending email for existing booking:', emailError);
          // Don't fail the request if email fails
        }
      } else {
        console.log('[ensure-booking] Email already sent for existing booking');
      }

      return new Response(
        JSON.stringify({
          success: true,
          bookingId: existingBooking.id,
          alreadyExisted: true,
          message: 'Booking already exists',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 2: Create booking via create-booking (gateway-agnostic)
    const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-booking`;
    const createBookingResponse = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        checkoutSessionId: sessionId,
        paymentGateway,
      }),
    });

    const payloadText = await createBookingResponse.text();
    let payload: any;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      payload = { error: payloadText };
    }

    if (!createBookingResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: payload.error || `Failed to create booking (${createBookingResponse.status})`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(payloadText, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


