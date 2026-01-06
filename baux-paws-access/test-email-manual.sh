#!/bin/bash

# Manual test script for email sending
# This script fetches the booking and manually triggers the email

SESSION_ID="cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI"
SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"

echo "=== Testing Email Send for Session: $SESSION_ID ==="
echo ""

# Step 1: Get the booking from database
echo "Step 1: Fetching booking from database..."
echo ""

# Use Supabase CLI to query the booking
BOOKING_JSON=$(npx supabase db execute --sql "SELECT * FROM booking WHERE stripe_checkout_session_id = '$SESSION_ID' LIMIT 1" --output json 2>/dev/null)

if [ -z "$BOOKING_JSON" ] || [ "$BOOKING_JSON" = "[]" ]; then
  echo "❌ No booking found for session ID: $SESSION_ID"
  echo ""
  echo "Let's check if the booking exists with a different query..."
  npx supabase db execute --sql "SELECT id, customer_email, product_name, stripe_checkout_session_id FROM booking WHERE stripe_checkout_session_id LIKE '%$SESSION_ID%' LIMIT 5"
  exit 1
fi

echo "✅ Booking found!"
echo ""

# Parse booking data (simplified - we'll use a Node.js script for proper parsing)
echo "Step 2: Preparing email payload..."
echo ""

# For now, let's create a simple Node.js script to do this properly
cat > /tmp/test-email-send.js << 'NODEJS'
const https = require('https');

const SESSION_ID = process.argv[2] || 'cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI';
const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in environment');
  process.exit(1);
}

async function testEmail() {
  try {
    // Fetch booking
    const bookingUrl = `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=eq.${SESSION_ID}&select=*`;
    
    const bookingResponse = await fetch(bookingUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!bookingResponse.ok) {
      throw new Error(`Failed to fetch booking: ${bookingResponse.statusText}`);
    }

    const bookings = await bookingResponse.json();
    
    if (bookings.length === 0) {
      console.error('❌ No booking found for session ID:', SESSION_ID);
      return;
    }

    const booking = bookings[0];
    console.log('✅ Booking found:');
    console.log('   ID:', booking.id);
    console.log('   Customer:', booking.customer_name, booking.customer_surname);
    console.log('   Email:', booking.customer_email);
    console.log('   Product:', booking.product_name);
    console.log('');

    // Format order number
    const formatOrderNumber = (sessionId) => {
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
      totalAmount: parseFloat(booking.total_amount_paid) || 0,
      currency: booking.currency || 'EUR',
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
    };

    console.log('📧 Sending email...');
    console.log('   Template ID: 2');
    console.log('   Recipient:', emailPayload.customerEmail);
    console.log('');

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
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('   Response:', JSON.stringify(emailResult, null, 2));
      console.log('');
      console.log('Please check your inbox at:', emailPayload.customerEmail);
    } else {
      console.error('❌ EMAIL SENDING FAILED');
      console.error('   Status:', emailResponse.status);
      console.error('   Error:', JSON.stringify(emailResult, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testEmail();
NODEJS

echo "Step 3: Running email test script..."
echo ""

node /tmp/test-email-send.js "$SESSION_ID"




