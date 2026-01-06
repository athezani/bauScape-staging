/**
 * Script to find Stripe session ID for order #NB9D1CQO and create booking
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const ORDER_NUMBER = 'NB9D1CQO';

async function findAndCreateBooking() {
  console.log(`\n🔍 Searching Stripe for session ending with: ${ORDER_NUMBER}`);
  console.log(`This will search recent Stripe checkout sessions and create the booking if found.\n`);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/find-stripe-session`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderNumber: ORDER_NUMBER,
      limit: 500, // Search up to 500 recent sessions
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`❌ Error: ${response.status}`);
    console.error(`Response: ${responseText}`);
    process.exit(1);
  }

  try {
    const result = JSON.parse(responseText);
    
    if (result.success) {
      console.log(`\n✅ SUCCESS! Found and processed booking!`);
      console.log(`\nSession Details:`);
      console.log(`  Session ID: ${result.sessionId}`);
      console.log(`  Payment Status: ${result.session.payment_status}`);
      console.log(`  Customer Email: ${result.session.customer_email}`);
      console.log(`  Created: ${new Date(result.session.created * 1000).toISOString()}`);
      
      console.log(`\nBooking Creation Result:`);
      console.log(`  Success: ${result.ensureBookingResult.success}`);
      console.log(`  Booking ID: ${result.ensureBookingResult.bookingId || 'N/A'}`);
      console.log(`  Already Existed: ${result.ensureBookingResult.alreadyExisted || false}`);
      
      if (result.ensureBookingResult.success) {
        console.log(`\n✅ Booking is now created in the database!`);
      } else {
        console.log(`\n⚠️  Booking creation had issues:`, result.ensureBookingResult);
      }
    } else {
      console.log(`\n❌ ${result.message || 'Session not found'}`);
      if (result.searched) {
        console.log(`Searched ${result.searched} sessions.`);
      }
    }
  } catch (error) {
    console.error(`❌ Error parsing response:`, error.message);
    console.error(`Raw response:`, responseText);
    process.exit(1);
  }
}

findAndCreateBooking().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});




