/**
 * Test script to manually trigger email sending
 * Run with: deno run --allow-net --allow-env test-email-send.ts
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Test with the session ID from the URL
const SESSION_ID = 'cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI';

async function testEmailSend() {
  console.log('=== TESTING EMAIL SEND ===');
  console.log('Session ID:', SESSION_ID);
  
  try {
    // First, get the booking from the database using the session ID
    const bookingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=eq.${SESSION_ID}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!bookingResponse.ok) {
      console.error('Failed to fetch booking:', await bookingResponse.text());
      return;
    }

    const bookings = await bookingResponse.json();
    console.log('Bookings found:', bookings.length);

    if (bookings.length === 0) {
      console.error('No booking found for session ID:', SESSION_ID);
      return;
    }

    const booking = bookings[0];
    console.log('Booking found:', {
      id: booking.id,
      customer_email: booking.customer_email,
      customer_name: booking.customer_name,
      product_name: booking.product_name,
    });

    // Format order number
    const formatOrderNumber = (sessionId: string) => {
      return sessionId.slice(-8).toUpperCase();
    };

    // Prepare email payload
    const emailPayload = {
      type: 'order_confirmation',
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name || 'Cliente',
      customerSurname: booking.customer_surname || undefined,
      customerPhone: booking.customer_phone || undefined,
      productName: booking.product_name,
      productDescription: booking.product_description || undefined,
      productType: booking.product_type,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time || undefined,
      numberOfAdults: booking.number_of_adults || 1,
      numberOfDogs: booking.number_of_dogs || 0,
      totalAmount: booking.total_amount_paid || 0,
      currency: booking.currency || 'EUR',
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
    };

    console.log('\n=== SENDING EMAIL ===');
    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));

    // Call send-transactional-email function
    const emailResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/send-transactional-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify(emailPayload),
      }
    );

    const emailResult = await emailResponse.json();
    
    if (emailResponse.ok) {
      console.log('\n✅ EMAIL SENT SUCCESSFULLY');
      console.log('Response:', JSON.stringify(emailResult, null, 2));
    } else {
      console.error('\n❌ EMAIL SENDING FAILED');
      console.error('Status:', emailResponse.status);
      console.error('Error:', JSON.stringify(emailResult, null, 2));
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Stack:', error.stack);
  }
}

testEmailSend();

