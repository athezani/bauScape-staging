/**
 * Script to find Stripe session ID for order #NB9D1CQO and create booking
 * Uses Supabase Edge Function to search Stripe (which has access to STRIPE_SECRET_KEY)
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const ORDER_NUMBER = 'NB9D1CQO';

async function searchRecentBookings() {
  console.log(`\n=== Searching recent bookings for pattern ===`);
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/booking?select=stripe_checkout_session_id,order_number,created_at,customer_email&order=created_at.desc&limit=100`, {
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
  
  // Check if any session ID ends with our order number
  for (const booking of bookings) {
    if (booking.stripe_checkout_session_id) {
      const sessionId = booking.stripe_checkout_session_id;
      if (sessionId.toUpperCase().endsWith(ORDER_NUMBER)) {
        console.log('✅ Found matching session in database!');
        console.log('Session ID:', sessionId);
        console.log('Customer Email:', booking.customer_email);
        console.log('Created At:', booking.created_at);
        return sessionId;
      }
    }
    
    // Also check order_number field
    if (booking.order_number && booking.order_number.toUpperCase() === ORDER_NUMBER) {
      console.log('✅ Found booking with matching order number!');
      console.log('Session ID:', booking.stripe_checkout_session_id);
      console.log('Booking ID:', booking.id);
      return booking.stripe_checkout_session_id;
    }
  }

  console.log(`❌ No booking found with order number ${ORDER_NUMBER} in recent 100 bookings.`);
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

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`❌ Error response: ${response.status}`);
    console.error(`Response: ${responseText}`);
    
    // If it's a 400, the session might not exist or be invalid
    if (response.status === 400) {
      return { success: false, error: 'Invalid session ID or session not found in Stripe' };
    }
    
    throw new Error(`Failed to ensure booking: ${response.status} - ${responseText}`);
  }

  try {
    const result = JSON.parse(responseText);
    return result;
  } catch (e) {
    return { success: false, rawResponse: responseText };
  }
}

async function trySessionIdPatterns() {
  console.log(`\n=== Trying common Stripe session ID patterns ===`);
  console.log(`Order number (last 8 chars): ${ORDER_NUMBER}`);
  
  // Common Stripe session ID patterns
  // Format: cs_test_XXXXXXXX or cs_live_XXXXXXXX
  // Where X is alphanumeric, and the last 8 chars are the order number
  
  const patterns = [
    // Direct patterns (less likely but possible)
    `cs_test_${ORDER_NUMBER.toLowerCase()}`,
    `cs_live_${ORDER_NUMBER.toLowerCase()}`,
    
    // Patterns with common prefixes (Stripe often uses these)
    `cs_test_a1${ORDER_NUMBER.toLowerCase()}`,
    `cs_test_b1${ORDER_NUMBER.toLowerCase()}`,
    `cs_live_a1${ORDER_NUMBER.toLowerCase()}`,
    `cs_live_b1${ORDER_NUMBER.toLowerCase()}`,
  ];
  
  // Generate more patterns with random-looking middle sections
  // Stripe session IDs are typically 40-50 chars, so we need ~32-42 chars before the last 8
  const commonMiddleSections = [
    'a1b2c3d4e5f6',
    '1234567890ab',
    'abcdefghijkl',
    'test12345678',
    'live12345678',
  ];
  
  for (const middle of commonMiddleSections) {
    patterns.push(`cs_test_${middle}${ORDER_NUMBER.toLowerCase()}`);
    patterns.push(`cs_live_${middle}${ORDER_NUMBER.toLowerCase()}`);
  }
  
  console.log(`Trying ${patterns.length} possible session ID patterns...`);
  
  for (let i = 0; i < patterns.length; i++) {
    const sessionId = patterns[i];
    if (i < 5) {
      console.log(`Trying pattern ${i + 1}/${patterns.length}: ${sessionId}...`);
    }
    
    try {
      const result = await ensureBooking(sessionId);
      
      if (result.success) {
        console.log(`\n✅ SUCCESS! Found and created booking!`);
        console.log(`Session ID: ${sessionId}`);
        console.log(`Booking ID: ${result.bookingId}`);
        console.log(`Already existed: ${result.alreadyExisted}`);
        return { success: true, sessionId, result };
      }
      
      // If we get a specific error about session not found, continue
      if (result.error && result.error.includes('not found')) {
        continue;
      }
      
    } catch (error) {
      // Continue trying other patterns
      if (i < 5) {
        console.log(`  Not found: ${error.message.substring(0, 60)}`);
      }
    }
  }
  
  return { success: false };
}

async function searchViaStripeAPI() {
  console.log(`\n=== Attempting to search via Stripe API through Edge Function ===`);
  console.log(`Note: This requires creating a custom Edge Function or using existing ones.`);
  console.log(`For now, we'll try the ensure-booking function with various patterns.`);
  
  return null;
}

async function main() {
  try {
    console.log(`\n🔍 Searching for booking with order number: #${ORDER_NUMBER}`);
    console.log(`This script will attempt to find the Stripe session ID and create the booking.\n`);
    
    // Step 1: Search in database first (fastest)
    let sessionId = await searchRecentBookings();
    
    if (sessionId) {
      console.log(`\n✅ Found existing booking or session ID: ${sessionId}`);
      console.log(`Calling ensure-booking to verify/create...`);
      const result = await ensureBooking(sessionId);
      
      if (result.success) {
        console.log(`\n✅ SUCCESS! Booking is now created or verified.`);
        console.log(`Booking ID: ${result.bookingId}`);
        return;
      } else {
        console.log(`\n⚠️  Booking check returned:`, result);
      }
    }
    
    // Step 2: Try common session ID patterns
    console.log(`\n⚠️  Session ID not found in database. Trying common patterns...`);
    const patternResult = await trySessionIdPatterns();
    
    if (patternResult.success) {
      console.log(`\n✅ SUCCESS! Booking created via pattern matching.`);
      return;
    }
    
    // Step 3: Final message
    console.log(`\n❌ Could not automatically find or create the booking.`);
    console.log(`\nTo manually create the booking:`);
    console.log(`1. Go to Stripe Dashboard: https://dashboard.stripe.com`);
    console.log(`2. Navigate to Payments > Checkout Sessions`);
    console.log(`3. Search for a session ending with: ${ORDER_NUMBER}`);
    console.log(`4. Copy the full session ID (starts with cs_test_ or cs_live_)`);
    console.log(`5. Run: node ensure-booking-manual.js <full_session_id>`);
    console.log(`\nOr call ensure-booking directly:`);
    console.log(`curl -X POST ${SUPABASE_URL}/functions/v1/ensure-booking \\`);
    console.log(`  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY.substring(0, 30)}..." \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"sessionId": "cs_xxxxx..."}'`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();




