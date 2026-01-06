import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTk3NDcsImV4cCI6MjA0OTkzNTc0N30.TwqxlB3nZAmO2ZW7lKw_k6c0A7rV5M_s1KfbVVMApTE';
const ADMIN_EMAIL = 'a.thezani@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestBooking {
  bookingId: string;
  orderNumber: string;
  requestId?: string;
  status: 'created' | 'request_sent' | 'failed';
  error?: string;
}

async function createPastBooking(index: number): Promise<TestBooking> {
  const orderNumber = `PAST${Date.now()}_${index}`;
  
  // Get a product
  const { data: product } = await supabase
    .from('experience')
    .select('id, name, provider_id, cancellation_policy')
    .not('provider_id', 'is', null)
    .limit(1)
    .single();

  if (!product) {
    return {
      bookingId: '',
      orderNumber,
      status: 'failed',
      error: 'No product found',
    };
  }

  // Create booking 7 days in the future (valid for cancellation)
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 7);

  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .insert({
      order_number: orderNumber,
      customer_email: ADMIN_EMAIL,
      customer_name: `Test User ${index}`,
      product_type: 'experience',
      product_id: product.id,
      product_name: product.name,
      provider_id: product.provider_id,
      booking_date: bookingDate.toISOString().split('T')[0],
      number_of_adults: 2,
      number_of_dogs: 1,
      total_amount_paid: 100.00 + index,
      currency: 'EUR',
      status: 'confirmed',
      stripe_checkout_session_id: `cs_past_${Date.now()}_${index}`,
      confirmation_email_sent: true,
    })
    .select()
    .single();

  if (bookingError || !booking) {
    return {
      bookingId: '',
      orderNumber,
      status: 'failed',
      error: bookingError?.message || 'Failed to create booking',
    };
  }

  return {
    bookingId: booking.id,
    orderNumber,
    status: 'created',
  };
}

async function requestCancellation(booking: TestBooking): Promise<TestBooking> {
  // Wait a moment for booking to be available
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: booking.orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: `Test User ${booking.orderNumber.split('_')[1]}`,
        reason: `Test cancellazione prenotazione passata #${booking.orderNumber.split('_')[1]}`,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        ...booking,
        requestId: data.requestId,
        status: 'request_sent',
      };
    } else {
      return {
        ...booking,
        status: 'failed',
        error: data.message || JSON.stringify(data),
      };
    }
  } catch (error) {
    return {
      ...booking,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTest() {
  console.log('🚀 === CREATING 10 PAST BOOKINGS AND CANCELLATION REQUESTS ===\n');
  console.log(`📧 All emails will be sent to: ${ADMIN_EMAIL}\n`);

  const results: TestBooking[] = [];

  // Step 1: Create 10 past bookings
  console.log('📝 Step 1: Creating 10 past bookings (10 days ago)...\n');
  
  for (let i = 1; i <= 10; i++) {
    console.log(`Creating booking ${i}/10...`);
    const booking = await createPastBooking(i);
    results.push(booking);
    
    if (booking.status === 'created') {
      console.log(`  ✅ Created: ${booking.orderNumber} (ID: ${booking.bookingId.substring(0, 8)}...)`);
    } else {
      console.log(`  ❌ Failed: ${booking.error}`);
    }
    
    // Small delay between creations
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Created ${results.filter(r => r.status === 'created').length}/10 bookings\n`);

  // Step 2: Request cancellation for each
  console.log('📞 Step 2: Requesting cancellation for each booking...\n');

  const successful = results.filter(r => r.status === 'created');
  
  for (let i = 0; i < successful.length; i++) {
    const booking = successful[i];
    console.log(`Requesting cancellation ${i + 1}/${successful.length} for ${booking.orderNumber}...`);
    
    const updated = await requestCancellation(booking);
    results[i] = updated;
    
    if (updated.status === 'request_sent') {
      console.log(`  ✅ Request sent! Request ID: ${updated.requestId?.substring(0, 8)}...`);
    } else {
      console.log(`  ❌ Failed: ${updated.error}`);
    }
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const created = results.filter(r => r.status === 'created').length;
  const requestsSent = results.filter(r => r.status === 'request_sent').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log(`\n✅ Bookings created: ${created}/10`);
  console.log(`✅ Cancellation requests sent: ${requestsSent}/${created}`);
  console.log(`❌ Failed: ${failed}`);

  if (requestsSent > 0) {
    console.log(`\n📧 CHECK YOUR EMAIL: ${ADMIN_EMAIL}`);
    console.log(`   You should receive ${requestsSent} email(s) with cancellation requests!`);
    console.log(`\n📋 Request IDs for manual testing:`);
    results
      .filter(r => r.requestId)
      .forEach((r, idx) => {
        console.log(`   ${idx + 1}. Order: ${r.orderNumber} → Request: ${r.requestId}`);
      });
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Check your email inbox for cancellation request notifications');
  console.log('   2. Use the Request IDs above to approve/reject via API');
  console.log('   3. Or use the admin dashboard to process them');
  
  console.log('\n💡 To approve a request, use:');
  console.log(`   curl -X POST ${SUPABASE_URL}/functions/v1/admin-process-cancellation \\`);
  console.log(`     -H "Authorization: Bearer YOUR_SERVICE_KEY" \\`);
  console.log(`     -H "apikey: YOUR_SERVICE_KEY" \\`);
  console.log(`     -d '{"requestId":"REQUEST_ID","action":"approve","adminEmail":"${ADMIN_EMAIL}","adminNotes":"Test approval"}'`);

  console.log('\n✨ Test completed!');
}

runTest();

