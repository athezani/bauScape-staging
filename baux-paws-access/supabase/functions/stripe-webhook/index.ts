/**
 * Supabase Edge Function: Stripe Webhook Handler
 * 
 * Handles Stripe webhook events, particularly checkout.session.completed
 * Creates booking in database and sends confirmation email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Get current time in CET (Central European Time) / CEST (Central European Summer Time)
 * Returns ISO string in UTC that when read in CET timezone will show the correct CET time
 */
function getCurrentTimeInCET(): string {
  const now = new Date();
  
  // Get current time in CET and UTC to calculate offset
  const cetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Get time strings
  const cetStr = cetFormatter.format(now);
  const utcStr = utcFormatter.format(now);
  
  // Parse to get time components
  const parseTime = (str: string) => {
    const [datePart, timePart] = str.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    return { year, month, day, hour, minute, second };
  };
  
  const cet = parseTime(cetStr);
  const utc = parseTime(utcStr);
  
  // Calculate offset in hours (CET is ahead of UTC)
  const cetHours = parseInt(cet.hour);
  const utcHours = parseInt(utc.hour);
  let offsetHours = cetHours - utcHours;
  
  // Handle day rollover
  if (parseInt(cet.day) !== parseInt(utc.day)) {
    offsetHours += 24;
  }
  
  // Create UTC timestamp that represents the CET time
  // We subtract the offset to get the equivalent UTC time
  const cetAsDate = new Date(`${cet.year}-${cet.month.padStart(2, '0')}-${cet.day.padStart(2, '0')}T${cet.hour.padStart(2, '0')}:${cet.minute.padStart(2, '0')}:${cet.second.padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`);
  const cetTimestamp = cetAsDate.getTime();
  const offsetMs = offsetHours * 60 * 60 * 1000;
  const utcEquivalent = new Date(cetTimestamp - offsetMs);
  
  return utcEquivalent.toISOString();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
      payment_intent?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
        name?: string;
        phone?: string;
      };
      amount_total?: number;
      currency?: string;
      [key: string]: any;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe webhook secret from environment
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeWebhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set - webhook signature verification skipped');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    
    // For now, we'll skip signature verification in development
    // In production, you should verify the signature using Stripe's SDK
    // const stripe = new Stripe(stripeSecretKey);
    // const event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);

    // Parse request body
    const event: StripeEvent = await req.json();

    console.log('=== STRIPE WEBHOOK RECEIVED ===');
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);
    console.log('Full event:', JSON.stringify(event, null, 2));

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      console.log('Processing checkout.session.completed event...');
      const session = event.data.object;
      const metadata = session.metadata || {};

      console.log('Session ID:', session.id);
      console.log('Session metadata:', JSON.stringify(metadata, null, 2));
      console.log('Customer email:', session.customer_email || session.customer_details?.email);

      // Extract booking details from metadata
      const productId = metadata.product_id;
      const productType = metadata.product_type as 'experience' | 'class' | 'trip';
      const availabilitySlotId = metadata.availability_slot_id;
      const bookingDate = metadata.booking_date;
      const bookingTime = metadata.booking_time || null;
      const numberOfAdults = parseInt(metadata.number_of_adults || '1');
      const numberOfDogs = parseInt(metadata.number_of_dogs || '0');
      const productName = metadata.product_name || 'Prodotto';
      const totalAmount = parseFloat(metadata.total_amount || '0');
      const quotationId = metadata.quotation_id || null; // NEW: Extract quotation_id

      console.log('[stripe-webhook] Extracted booking details:', {
        productId,
        productType,
        availabilitySlotId,
        bookingDate,
        bookingTime,
        numberOfAdults,
        numberOfDogs,
        productName,
        totalAmount,
        quotationId, // NEW: Log quotation_id
      });

      // Extract customer information from metadata (ALWAYS from internal checkout)
      // All customer data is in metadata - no custom fields needed
      const customerEmail = metadata.customer_email || session.customer_email || session.customer_details?.email || '';
      const customerFirstName = metadata.customer_name || '';
      const customerLastName = metadata.customer_surname || '';
      const customerPhone = metadata.customer_phone || session.customer_details?.phone || null;
      
      // Validate that we have required customer data
      if (!customerEmail) {
        console.error('[stripe-webhook] Missing customer email in metadata and session');
      }
      if (!customerFirstName && !customerLastName) {
        console.warn('[stripe-webhook] Missing customer name in metadata, using default');
      }
      
      // Combine first and last name for customer_name (backward compatibility)
      const customerName = `${customerFirstName}${customerLastName ? ' ' + customerLastName : ''}`.trim() || 'Cliente';
      
      console.log('[stripe-webhook] Extracted customer data from metadata:', {
        email: customerEmail,
        firstName: customerFirstName,
        lastName: customerLastName,
        phone: customerPhone,
        quotationId,
      });

      // Helper function to format order number
      const formatOrderNumber = (sessionId: string): string => {
        return sessionId.slice(-8).toUpperCase();
      };

      // Fetch product details to get provider_id
      const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
      console.log(`[stripe-webhook] Fetching product: table=${tableName}, productId=${productId}`);
      
      // For trips, also fetch start_date and end_date
      // Note: no_adults only exists for experience and class, not for trip
      const selectFields = productType === 'trip' 
        ? 'provider_id, name, description, start_date, end_date'
        : 'provider_id, name, description, no_adults';
      
      const { data: product, error: productError } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('[stripe-webhook] Error fetching product:', productError);
        throw new Error(`Product not found: ${productError?.message}`);
      }

      console.log(`[stripe-webhook] Product found:`, { 
        name: product.name, 
        provider_id: product.provider_id,
        has_provider_id: !!product.provider_id 
      });

      // Fallback: if provider_id is null, try to get it from availability_slot's product
      let providerId = product.provider_id;
      if (!providerId && availabilitySlotId) {
        console.log(`[stripe-webhook] provider_id is null, trying to get from availability_slot: ${availabilitySlotId}`);
        // Get product_id from availability_slot, then fetch product again
        const { data: slot, error: slotError } = await supabase
          .from('availability_slot')
          .select('product_id, product_type')
          .eq('id', availabilitySlotId)
          .single();

        if (!slotError && slot && slot.product_id) {
          // Try fetching product again with the product_id from slot
          const { data: productFromSlot, error: productFromSlotError } = await supabase
            .from(tableName)
            .select('provider_id')
            .eq('id', slot.product_id)
            .single();

          if (!productFromSlotError && productFromSlot && productFromSlot.provider_id) {
            providerId = productFromSlot.provider_id;
            console.log(`[stripe-webhook] Retrieved provider_id from availability_slot product: ${providerId}`);
          } else {
            console.warn(`[stripe-webhook] Could not fetch provider_id from slot product:`, productFromSlotError);
          }
        } else {
          console.warn(`[stripe-webhook] Could not fetch availability_slot:`, slotError);
        }
      }

      // Final fallback: try to get default provider "lastminute.com"
      if (!providerId) {
        console.log(`[stripe-webhook] provider_id still null, trying to get default provider "lastminute.com"`);
        const { data: defaultProvider, error: defaultProviderError } = await supabase
          .from('profile')
          .select('id')
          .or('company_name.ilike.%lastminute%,company_name.ilike.%last minute%')
          .limit(1)
          .maybeSingle();

        if (!defaultProviderError && defaultProvider && defaultProvider.id) {
          providerId = defaultProvider.id;
          console.log(`[stripe-webhook] Using default provider: ${providerId}`);
        } else {
          // Last resort: get any active provider
          console.log(`[stripe-webhook] Default provider not found, trying any active provider`);
          const { data: anyProvider, error: anyProviderError } = await supabase
            .from('profile')
            .select('id')
            .eq('active', true)
            .limit(1)
            .maybeSingle();

          if (!anyProviderError && anyProvider && anyProvider.id) {
            providerId = anyProvider.id;
            console.log(`[stripe-webhook] Using any active provider: ${providerId}`);
          } else {
            console.error(`[stripe-webhook] CRITICAL: No provider found at all`);
            throw new Error(`Provider ID is required but not found for product ${productId} (type: ${productType}). No providers available in system.`);
          }
        }
      }

      // Prepare booking data
      // Note: booking table doesn't have product_id column - link is via availability_slot_id
      
      // booking_time is now TIMESTAMPTZ - stores when the booking was made in CET (Italian timezone)
      const bookingTimeNow = getCurrentTimeInCET();
      
      // Calculate order number (last 8 characters of stripe_checkout_session_id in uppercase)
      const orderNumber = session.id ? session.id.slice(-8).toUpperCase() : null;
      
      // For trips, get start_date and end_date from product
      let tripStartDate: string | null = null;
      let tripEndDate: string | null = null;
      if (productType === 'trip' && product) {
        tripStartDate = (product as any).start_date || null;
        tripEndDate = (product as any).end_date || null;
        console.log(`[stripe-webhook] Trip dates: start=${tripStartDate}, end=${tripEndDate}`);
      }
      
      const bookingData = {
        product_type: productType,
        provider_id: providerId,
        availability_slot_id: availabilitySlotId || null, // Ensure null instead of undefined
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        order_number: orderNumber, // Order number (last 8 chars of session ID)
        status: 'confirmed',
        booking_date: bookingDate,
        booking_time: bookingTimeNow, // TIMESTAMPTZ: when booking was made
        trip_start_date: tripStartDate, // For trips: start date of the trip product
        trip_end_date: tripEndDate, // For trips: end date of the trip product
        number_of_adults: numberOfAdults,
        number_of_dogs: numberOfDogs,
        total_amount_paid: totalAmount,
        currency: session.currency?.toUpperCase() || 'EUR',
        customer_email: customerEmail,
        customer_name: customerName,
        customer_surname: customerLastName || null,
        customer_phone: customerPhone,
        product_name: productName,
        product_description: product.description || null,
      };

      console.log('[stripe-webhook] Calling create-booking function for session:', session.id);

      // Use the new transactional create-booking function
      const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-booking`;
      const createBookingResponse = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          checkoutSessionId: session.id,
          paymentGateway: 'stripe',
          idempotencyKey: event.id,
        }),
      });

      if (!createBookingResponse.ok) {
        const errorText = await createBookingResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('[stripe-webhook] === BOOKING CREATION ERROR ===');
        console.error('[stripe-webhook] Error:', errorData);
        throw new Error(`Failed to create booking: ${errorData.error || errorText}`);
      }

      const createBookingResult = await createBookingResponse.json();
      
      if (!createBookingResult.success) {
        console.error('[stripe-webhook] === BOOKING CREATION ERROR ===');
        console.error('[stripe-webhook] Error:', createBookingResult.error);
        throw new Error(`Failed to create booking: ${createBookingResult.error}`);
      }

      const bookingId = createBookingResult.bookingId;
      console.log('=== BOOKING CREATED SUCCESSFULLY ===');
      console.log('Booking ID:', bookingId);
      console.log('Stripe Session ID:', session.id);
      console.log('Already Existed:', createBookingResult.alreadyExisted);

      // ============================================
      // RECONCILE QUOTATION: Update quotation status and booking_id
      // ============================================
      if (quotationId) {
        console.log('[stripe-webhook] Reconciling quotation:', quotationId);
        try {
          const { error: quotationUpdateError } = await supabase
            .from('quotation')
            .update({
              status: 'booking',
              booking_id: bookingId,
            })
            .eq('id', quotationId);

          if (quotationUpdateError) {
            console.error('[stripe-webhook] Failed to update quotation:', quotationUpdateError);
            // Don't throw - quotation update failure should not block the webhook
            // The booking was created successfully, quotation update is secondary
          } else {
            console.log('[stripe-webhook] ✅ Quotation reconciled successfully:', {
              quotationId,
              bookingId,
              status: 'booking',
            });
          }
        } catch (quotationException) {
          console.error('[stripe-webhook] Exception updating quotation:', quotationException);
          // Don't throw - continue with email sending
        }
      } else {
        console.log('[stripe-webhook] No quotation_id in metadata - skipping quotation reconciliation (legacy flow)');
      }

      // Fetch booking details for email
      const { data: booking, error: fetchError } = await supabase
        .from('booking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.warn('[stripe-webhook] Could not fetch booking details for email:', fetchError);
        // Continue anyway - booking was created
      } else {
        console.log('Customer Email:', booking.customer_email);
        console.log('Product:', booking.product_name);
        console.log('Date:', booking.booking_date);
        console.log('Amount:', booking.total_amount_paid, booking.currency);
      }

      // Fallback: Send email if create-booking didn't send it (guarantee email delivery)
      if (booking) {
        const { data: bookingCheck, error: checkError } = await supabase
          .from('booking')
          .select('confirmation_email_sent, availability_slot_id')
          .eq('id', bookingId)
          .single();

        if (!checkError && bookingCheck && !bookingCheck.confirmation_email_sent) {
          console.log('[stripe-webhook] Email not sent by create-booking, sending as fallback...');
          try {
            // Load activity time range from availability slot (start and end time)
            let activityTimeRange: string | null = null;
            if (bookingCheck.availability_slot_id) {
              const { data: slot } = await supabase
                .from('availability_slot')
                .select('time_slot, end_time')
                .eq('id', bookingCheck.availability_slot_id)
                .single();
              
              if (slot?.time_slot) {
                // Format time range: "HH:MM - HH:MM" or just "HH:MM" if no end_time
                const formatTimeForDisplay = (timeStr: string | null): string => {
                  if (!timeStr) return '';
                  const timeParts = timeStr.split(':');
                  if (timeParts.length >= 2) {
                    const hours = timeParts[0].padStart(2, '0');
                    const minutes = timeParts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                  }
                  return timeStr;
                };
                
                const startTime = formatTimeForDisplay(slot.time_slot);
                const endTime = formatTimeForDisplay(slot.end_time);
                
                if (endTime) {
                  activityTimeRange = `${startTime} - ${endTime}`;
                } else {
                  activityTimeRange = startTime;
                }
                
                console.log('[stripe-webhook] Activity time range loaded from slot', { 
                  slotId: bookingCheck.availability_slot_id,
                  timeSlot: slot.time_slot,
                  endTime: slot.end_time,
                  formattedRange: activityTimeRange
                });
              }
            }

            const emailFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-transactional-email`;
            
            const productNoAdults = productType !== 'trip' && product 
              ? ((product as any).no_adults === true || (product as any).no_adults === 1) 
              : false;
            
            const emailPayload = {
              type: 'order_confirmation',
              bookingId: booking.id,
              customerEmail: booking.customer_email,
              customerName: booking.customer_name,
              customerSurname: booking.customer_surname || undefined,
              customerPhone: booking.customer_phone || undefined,
              productName: booking.product_name,
              productDescription: booking.product_description || undefined,
              productType: booking.product_type,
              bookingDate: booking.booking_date,
              bookingTime: activityTimeRange || undefined, // Use activity time range (start - end) instead of booking time
              numberOfAdults: booking.number_of_adults,
              numberOfDogs: booking.number_of_dogs,
              totalAmount: booking.total_amount_paid,
              currency: booking.currency,
              orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
              noAdults: productNoAdults,
            };

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
                .eq('id', bookingId);
              console.log('[stripe-webhook] ✅ Fallback email sent successfully');
            } else {
              console.error('[stripe-webhook] Fallback email sending failed');
            }
          } catch (emailError) {
            console.error('[stripe-webhook] Fallback email error:', emailError);
          }
        } else if (bookingCheck?.confirmation_email_sent) {
          console.log('[stripe-webhook] Email already sent by create-booking, skipping');
        }
      }

      return new Response(
        JSON.stringify({ 
          received: true,
          bookingId: bookingId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle other event types
    console.log(`Unhandled event type: ${event.type}`);
    console.log('Event data:', JSON.stringify(event.data, null, 2));
    return new Response(
      JSON.stringify({ 
        received: true,
        eventType: event.type,
        message: `Event ${event.type} received but not processed`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

