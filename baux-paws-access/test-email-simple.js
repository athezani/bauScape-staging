/**
 * Simple test script to manually trigger email sending
 * Usage: node test-email-simple.js
 * 
 * Make sure to set SUPABASE_SERVICE_ROLE_KEY in environment or update the constant below
 */

const SESSION_ID = 'cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI';
const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';

// IMPORTANT: Replace with your actual service role key or set as environment variable
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in environment');
  console.error('');
  console.error('Please set it with:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('   or');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here node test-email-simple.js');
  console.error('');
  console.error('To get your Service Role Key:');
  console.error('   1. Go to Supabase Dashboard → Settings → API');
  console.error('   2. Find "service_role" key (NOT "anon" key)');
  console.error('   3. Copy the key');
  console.error('');
  console.error('You can verify your key first with:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key node verify-key.js');
  process.exit(1);
}

// Verify key format
if (SUPABASE_SERVICE_KEY.length < 100) {
  console.warn('⚠️  Warning: Service Role Key seems too short');
  console.warn('   Expected length: ~200+ characters');
  console.warn('   Your length:', SUPABASE_SERVICE_KEY.length);
  console.warn('');
}

async function testEmailSend() {
  console.log('=== TESTING EMAIL SEND ===');
  console.log('Session ID:', SESSION_ID);
  console.log('');

  try {
    // Step 1: Fetch booking from database
    console.log('Step 1: Fetching booking from database...');
    const bookingUrl = `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=eq.${SESSION_ID}&select=*`;
    
    const bookingResponse = await fetch(bookingUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      console.error('❌ Failed to fetch booking:', bookingResponse.status, errorText);
      return;
    }

    const bookings = await bookingResponse.json();
    
    if (bookings.length === 0) {
      console.error('❌ No booking found for session ID:', SESSION_ID);
      console.log('');
      console.log('Let me check if there are any bookings with similar session IDs...');
      
      // Try a partial match
      const partialUrl = `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=ilike.%${SESSION_ID.slice(-10)}%&select=id,customer_email,product_name,stripe_checkout_session_id&limit=5`;
      const partialResponse = await fetch(partialUrl, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      
      if (partialResponse.ok) {
        const partialBookings = await partialResponse.json();
        if (partialBookings.length > 0) {
          console.log('Found similar bookings:');
          partialBookings.forEach(b => {
            console.log(`  - ID: ${b.id}, Email: ${b.customer_email}, Session: ${b.stripe_checkout_session_id?.slice(-20)}`);
          });
        }
      }
      
      return;
    }

    const booking = bookings[0];
    console.log('✅ Booking found:');
    console.log('   ID:', booking.id);
    console.log('   Customer:', booking.customer_name, booking.customer_surname || '');
    console.log('   Email:', booking.customer_email);
    console.log('   Product:', booking.product_name);
    console.log('   Date:', booking.booking_date);
    console.log('   Amount:', booking.total_amount_paid, booking.currency);
    console.log('');

    // Step 2: Format order number
    const formatOrderNumber = (sessionId) => {
      return sessionId ? sessionId.slice(-8).toUpperCase() : 'UNKNOWN';
    };

    // Step 3: Prepare email payload
    console.log('Step 2: Preparing email payload...');
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
      totalAmount: parseFloat(booking.total_amount_paid) || 0,
      currency: booking.currency || 'EUR',
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
    };

    console.log('Email payload prepared:');
    console.log('   Type: order_confirmation');
    console.log('   Template ID: 2 (default)');
    console.log('   Recipient:', emailPayload.customerEmail);
    console.log('   Order Number:', emailPayload.orderNumber);
    console.log('');

    // Step 4: Call send-transactional-email function
    console.log('Step 3: Sending email via send-transactional-email function...');
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
    
    console.log('');
    if (emailResponse.ok) {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('   Response:', JSON.stringify(emailResult, null, 2));
      console.log('');
      console.log('📧 Please check your inbox at:', emailPayload.customerEmail);
      console.log('   (Also check spam folder if not found)');
    } else {
      console.error('❌ EMAIL SENDING FAILED');
      console.error('   Status:', emailResponse.status);
      console.error('   Status Text:', emailResponse.statusText);
      console.error('   Error:', JSON.stringify(emailResult, null, 2));
    }
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testEmailSend();

