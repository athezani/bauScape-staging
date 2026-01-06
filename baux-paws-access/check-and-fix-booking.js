/**
 * Script to check and fix missing booking for order #NB9D1CQO
 * This script will:
 * 1. Check if booking exists for the order
 * 2. If not, call ensure-booking to create it
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

// Order number: #NB9D1CQO (last 8 chars of session ID)
// We need to find the full session ID
const ORDER_NUMBER = 'NB9D1CQO';

async function findSessionIdByOrderNumber() {
  console.log(`\n=== Searching for session with order number: ${ORDER_NUMBER} ===`);
  
  // Query booking table to find session ID by order_number
  const response = await fetch(`${SUPABASE_URL}/rest/v1/booking?order_number=eq.${ORDER_NUMBER}&select=stripe_checkout_session_id,id,customer_email,created_at`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query booking: ${response.status} - ${errorText}`);
  }

  const bookings = await response.json();
  
  if (bookings.length > 0) {
    console.log('✅ Booking found!');
    console.log('Booking ID:', bookings[0].id);
    console.log('Session ID:', bookings[0].stripe_checkout_session_id);
    console.log('Customer Email:', bookings[0].customer_email);
    console.log('Created At:', bookings[0].created_at);
    return bookings[0].stripe_checkout_session_id;
  }

  console.log('❌ No booking found with this order number.');
  console.log('\nTrying to find session ID from Stripe...');
  console.log('Note: You may need to check Stripe dashboard for sessions ending with:', ORDER_NUMBER);
  
  return null;
}

async function ensureBooking(sessionId) {
  console.log(`\n=== Calling ensure-booking for session: ${sessionId} ===`);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ensure-booking`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to ensure booking: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  try {
    // Step 1: Check if booking exists
    const sessionId = await findSessionIdByOrderNumber();
    
    if (sessionId) {
      console.log('\n✅ Booking already exists!');
      return;
    }

    // Step 2: If no booking found, we need the full session ID
    // The user should provide the full Stripe session ID
    console.log('\n⚠️  To create the booking, we need the full Stripe checkout session ID.');
    console.log('The order number is the last 8 characters of the session ID.');
    console.log('Please check Stripe dashboard for a session ending with:', ORDER_NUMBER);
    console.log('\nOnce you have the full session ID, you can call ensure-booking manually:');
    console.log(`curl -X POST ${SUPABASE_URL}/functions/v1/ensure-booking \\`);
    console.log(`  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY.substring(0, 20)}..." \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"sessionId": "cs_xxxxx..."}'`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();




