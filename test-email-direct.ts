import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testEmailDirect() {
  console.log('🔍 Testing email sending directly...\n');
  
  // Get first pending cancellation request
  const { data: requests } = await supabase
    .from('cancellation_request')
    .select('id, booking_id')
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (!requests) {
    console.log('❌ No pending requests found');
    return;
  }

  console.log(`📋 Using request: ${requests.id}`);
  console.log(`📋 Booking ID: ${requests.booking_id}\n`);

  // Call send-transactional-email directly
  console.log('📧 Calling send-transactional-email function...\n');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      type: 'cancellation_request_admin',
      requestId: requests.id,
      bookingId: requests.booking_id,
    }),
  });

  const responseText = await response.text();
  console.log(`📥 Response Status: ${response.status}`);
  console.log(`📥 Response Body:\n${responseText}\n`);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.log('⚠️  Response is not JSON');
    return;
  }

  if (response.ok && data.success) {
    console.log('✅ Email sent successfully!');
    console.log('📧 Check a.thezani@gmail.com');
  } else {
    console.log('❌ Email sending failed!');
    console.log('Error:', data.error || data.message || JSON.stringify(data));
  }
}

testEmailDirect();

