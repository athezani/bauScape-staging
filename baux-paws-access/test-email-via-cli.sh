#!/bin/bash

# Test email sending using Supabase CLI (no need for service role key)
# This script uses Supabase CLI to query the database and trigger email

SESSION_ID="cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI"

echo "=== Testing Email Send via Supabase CLI ==="
echo "Session ID: $SESSION_ID"
echo ""

# Step 1: Check if booking exists
echo "Step 1: Checking if booking exists..."
echo ""

BOOKING_QUERY="SELECT id, customer_email, customer_name, customer_surname, product_name, product_type, booking_date, booking_time, number_of_adults, number_of_dogs, total_amount_paid, currency, stripe_checkout_session_id FROM booking WHERE stripe_checkout_session_id = '$SESSION_ID' LIMIT 1"

BOOKING_RESULT=$(npx supabase db execute --sql "$BOOKING_QUERY" --output json 2>&1)

if [ $? -ne 0 ] || [ -z "$BOOKING_RESULT" ] || [ "$BOOKING_RESULT" = "[]" ]; then
  echo "❌ No booking found for session ID: $SESSION_ID"
  echo ""
  echo "Let's check for similar session IDs..."
  npx supabase db execute --sql "SELECT id, customer_email, product_name, stripe_checkout_session_id FROM booking WHERE stripe_checkout_session_id LIKE '%${SESSION_ID: -20}%' LIMIT 5"
  exit 1
fi

echo "✅ Booking found!"
echo "$BOOKING_RESULT" | jq '.'
echo ""

# Step 2: Extract booking data (we'll need to parse JSON)
echo "Step 2: Preparing email payload..."
echo ""

# For now, let's create a Node.js script that uses Supabase client
# which can use the anon key from environment
cat > /tmp/test-email-cli.js << 'NODEJS'
const { createClient } = require('@supabase/supabase-js');

const SESSION_ID = process.argv[2] || 'cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI';
const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';

// Try to get service role key from Supabase CLI status
const { execSync } = require('child_process');
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  try {
    // Try to get from Supabase status
    const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf-8' }));
    serviceKey = status?.DB_PASSWORD || status?.service_role_key;
  } catch (e) {
    console.error('❌ Could not get service role key');
    console.error('   Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('   Or get it from: Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, serviceKey);

async function testEmail() {
  try {
    // Fetch booking
    const { data: bookings, error } = await supabase
      .from('booking')
      .select('*')
      .eq('stripe_checkout_session_id', SESSION_ID)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!bookings || bookings.length === 0) {
      console.error('❌ No booking found for session ID:', SESSION_ID);
      return;
    }

    const booking = bookings[0];
    console.log('✅ Booking found:');
    console.log('   ID:', booking.id);
    console.log('   Customer:', booking.customer_name, booking.customer_surname || '');
    console.log('   Email:', booking.customer_email);
    console.log('   Product:', booking.product_name);
    console.log('');

    // Format order number
    const formatOrderNumber = (sessionId) => {
      return sessionId ? sessionId.slice(-8).toUpperCase() : 'UNKNOWN';
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
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: emailPayload,
      }
    );

    if (emailError) {
      console.error('❌ EMAIL SENDING FAILED');
      console.error('   Error:', emailError);
    } else {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('   Response:', JSON.stringify(emailResult, null, 2));
      console.log('');
      console.log('📧 Please check your inbox at:', emailPayload.customerEmail);
      console.log('   (Also check spam folder if not found)');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testEmail();
NODEJS

echo "Step 3: Running email test..."
echo ""

node /tmp/test-email-cli.js "$SESSION_ID"




