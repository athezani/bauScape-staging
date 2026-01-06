import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTk3NDcsImV4cCI6MjA0OTkzNTc0N30.TwqxlB3nZAmO2ZW7lKw_k6c0A7rV5M_s1KfbVVMApTE';
const ADMIN_EMAIL = 'a.thezani@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testFullFlow() {
  console.log('🧪 Testing full cancellation flow with automatic email...\n');
  
  // 1. Create a test booking
  const timestamp = Date.now();
  const orderNumber = `FLOWTEST${timestamp}`;
  
  const { data: product } = await supabase
    .from('experience')
    .select('id, name, provider_id')
    .not('provider_id', 'is', null)
    .limit(1)
    .single();

  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 7);

  const { data: booking } = await supabase
    .from('booking')
    .insert({
      order_number: orderNumber,
      customer_email: ADMIN_EMAIL,
      customer_name: 'Flow Test User',
      product_type: 'experience',
      product_id: product.id,
      product_name: product.name,
      provider_id: product.provider_id,
      booking_date: bookingDate.toISOString().split('T')[0],
      number_of_adults: 2,
      number_of_dogs: 1,
      total_amount_paid: 150.00,
      currency: 'EUR',
      status: 'confirmed',
      stripe_checkout_session_id: `cs_flow_${timestamp}`,
      confirmation_email_sent: true,
    })
    .select()
    .single();

  console.log(`✅ Created booking: ${orderNumber}\n`);

  // 2. Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Create cancellation request (should trigger email automatically)
  console.log('📞 Creating cancellation request (should trigger email automatically)...\n');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      orderNumber: orderNumber,
      customerEmail: ADMIN_EMAIL,
      customerName: 'Flow Test User',
      reason: 'Test automatic email sending',
    }),
  });

  const data = await response.json();
  
  console.log(`Response Status: ${response.status}`);
  console.log(`Response: ${JSON.stringify(data, null, 2)}\n`);

  if (response.ok && data.success) {
    console.log('✅ Cancellation request created!');
    console.log(`   Request ID: ${data.requestId}`);
    console.log('\n📧 Email should be sent automatically!');
    console.log('   Check a.thezani@gmail.com in a few seconds...\n');
    
    // Wait a bit for email to be sent
    console.log('⏳ Waiting 3 seconds for email to be sent...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify request was created
    const { data: request } = await supabase
      .from('cancellation_request')
      .select('*')
      .eq('id', data.requestId)
      .single();
    
    if (request) {
      console.log('✅ Request verified in database');
      console.log(`   Status: ${request.status}`);
      console.log(`   Order: ${request.order_number}`);
    }
    
  } else {
    console.log('❌ Failed to create request:', data.message || JSON.stringify(data));
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test booking...');
  await supabase.from('booking').delete().eq('id', booking.id);
  console.log('✅ Done!');
}

testFullFlow();

