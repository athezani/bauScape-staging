import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testMinimal() {
  console.log('🔍 Testing minimal email call...\n');
  
  // Get first pending request
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: request } = await supabase
    .from('cancellation_request')
    .select('id, booking_id')
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (!request) {
    console.log('❌ No pending requests');
    return;
  }

  console.log(`Using request: ${request.id}\n`);

  // Try minimal payload
  const payload = {
    type: 'cancellation_request_admin',
    requestId: request.id,
    bookingId: request.booking_id,
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('\n📧 Calling function...\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Response:\n${text}`);

  if (response.status === 503) {
    console.log('\n❌ BOOT ERROR - Function cannot start');
    console.log('This usually means:');
    console.log('  1. Syntax error in the function code');
    console.log('  2. Missing import');
    console.log('  3. Type error at compile time');
    console.log('\nCheck the function code for errors!');
  }
}

testMinimal();

