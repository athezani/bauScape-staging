/**
 * Script to find and fix missing booking for order #NB9D1CQO
 * This script will:
 * 1. Search Stripe for sessions ending with NB9D1CQO
 * 2. If found, call ensure-booking to create the booking
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const ORDER_NUMBER = 'NB9D1CQO';

async function searchStripeSessions() {
  console.log(`\n=== Searching Stripe for sessions ending with: ${ORDER_NUMBER} ===`);
  
  // Get Stripe secret key from environment or use a test approach
  // We'll search recent sessions
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.log('⚠️  STRIPE_SECRET_KEY not found in environment.');
    console.log('Trying to search via Supabase Edge Function...');
    
    // Try to get it from Supabase secrets or use a different approach
    // We can search in booking table for similar patterns
    return await searchInDatabase();
  }

  try {
    // Search Stripe for checkout sessions
    // We'll search the last 100 sessions and filter
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stripe API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sessions = data.data || [];
    
    // Find session ending with ORDER_NUMBER
    const matchingSession = sessions.find(session => {
      const sessionId = session.id || '';
      return sessionId.toUpperCase().endsWith(ORDER_NUMBER);
    });

    if (matchingSession) {
      console.log('✅ Found matching session in Stripe!');
      console.log('Session ID:', matchingSession.id);
      console.log('Payment Status:', matchingSession.payment_status);
      console.log('Customer Email:', matchingSession.customer_email);
      return matchingSession.id;
    }

    console.log('❌ No matching session found in recent 100 sessions.');
    return null;
  } catch (error) {
    console.error('Error searching Stripe:', error.message);
    return await searchInDatabase();
  }
}

async function searchInDatabase() {
  console.log(`\n=== Searching database for recent sessions ===`);
  
  // Search for recent bookings to find pattern
  const response = await fetch(`${SUPABASE_URL}/rest/v1/booking?select=stripe_checkout_session_id,order_number,created_at&order=created_at.desc&limit=50`, {
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
        return sessionId;
      }
    }
  }

  console.log('❌ No matching session found in recent bookings.');
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
  console.log('✅ Result:', JSON.stringify(result, null, 2));
  return result;
}

async function tryCommonSessionPrefixes() {
  console.log(`\n=== Trying common Stripe session prefixes ===`);
  
  // Common Stripe session prefixes
  const prefixes = ['cs_test_', 'cs_live_'];
  
  for (const prefix of prefixes) {
    // Try to construct possible session IDs
    // Stripe session IDs are typically: prefix + random chars + last 8 chars
    // We'll try a few variations
    const possibleIds = [
      `${prefix}a${ORDER_NUMBER.toLowerCase()}`,
      `${prefix}${ORDER_NUMBER.toLowerCase()}`,
    ];
    
    for (const sessionId of possibleIds) {
      try {
        console.log(`Trying: ${sessionId}...`);
        const result = await ensureBooking(sessionId);
        if (result.success && !result.alreadyExisted) {
          console.log(`✅ Successfully created booking with session: ${sessionId}`);
          return true;
        } else if (result.alreadyExisted) {
          console.log(`✅ Booking already exists for session: ${sessionId}`);
          return true;
        }
      } catch (error) {
        // Continue trying
        console.log(`  Not found: ${error.message.substring(0, 50)}`);
      }
    }
  }
  
  return false;
}

async function main() {
  try {
    // Step 1: Search in database first (faster)
    let sessionId = await searchInDatabase();
    
    // Step 2: If not found, search Stripe
    if (!sessionId) {
      sessionId = await searchStripeSessions();
    }
    
    // Step 3: If found, create booking
    if (sessionId) {
      console.log(`\n✅ Found session ID: ${sessionId}`);
      const result = await ensureBooking(sessionId);
      
      if (result.success) {
        console.log('\n✅ SUCCESS! Booking created or already exists.');
        console.log('Booking ID:', result.bookingId);
        return;
      }
    }
    
    // Step 4: If still not found, try common patterns
    console.log('\n⚠️  Session ID not found via search. Trying common patterns...');
    const found = await tryCommonSessionPrefixes();
    
    if (!found) {
      console.log('\n❌ Could not find or create booking automatically.');
      console.log('\nPlease provide the full Stripe checkout session ID.');
      console.log('You can find it in:');
      console.log('1. Stripe Dashboard > Payments > Checkout Sessions');
      console.log('2. Look for a session ending with:', ORDER_NUMBER);
      console.log('\nThen run:');
      console.log(`node ensure-booking-manual.js <session_id>`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();




