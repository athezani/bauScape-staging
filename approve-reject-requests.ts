import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'a.thezani@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listPendingRequests() {
  console.log('📋 Fetching pending cancellation requests...\n');
  
  const { data: requests, error } = await supabase
    .from('cancellation_request')
    .select(`
      id,
      order_number,
      customer_name,
      customer_email,
      reason,
      requested_at,
      booking:booking_id (
        booking_date,
        product_name,
        total_amount_paid
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    console.log('❌ Error:', error.message);
    return [];
  }

  return requests || [];
}

async function processRequest(requestId: string, action: 'approve' | 'reject', notes?: string) {
  console.log(`\n🔄 Processing request ${requestId.substring(0, 8)}... (${action})`);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-process-cancellation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      requestId,
      action,
      adminEmail: ADMIN_EMAIL,
      adminNotes: notes || `Test ${action}`,
    }),
  });

  const data = await response.json();
  
  if (response.ok && data.success) {
    console.log(`✅ ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
    return true;
  } else {
    console.log(`❌ Failed: ${data.message || JSON.stringify(data)}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // List all pending requests
    const requests = await listPendingRequests();
    
    if (requests.length === 0) {
      console.log('✅ No pending requests found!');
      return;
    }
    
    console.log(`\n📊 Found ${requests.length} pending request(s):\n`);
    
    requests.forEach((req: any, idx: number) => {
      const booking = req.booking;
      console.log(`${idx + 1}. Order: ${req.order_number}`);
      console.log(`   Customer: ${req.customer_name} (${req.customer_email})`);
      console.log(`   Product: ${booking?.product_name || 'N/A'}`);
      console.log(`   Date: ${booking?.booking_date || 'N/A'}`);
      console.log(`   Amount: €${booking?.total_amount_paid || 'N/A'}`);
      console.log(`   Reason: ${req.reason || 'N/A'}`);
      console.log(`   Request ID: ${req.id}`);
      console.log(`   Requested: ${new Date(req.requested_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('💡 To approve/reject, use:');
    console.log('   npx tsx approve-reject-requests.ts approve REQUEST_ID');
    console.log('   npx tsx approve-reject-requests.ts reject REQUEST_ID');
    console.log('\n   Or approve/reject all:');
    console.log('   npx tsx approve-reject-requests.ts approve-all');
    console.log('   npx tsx approve-reject-requests.ts reject-all');
    
  } else if (args[0] === 'approve-all') {
    const requests = await listPendingRequests();
    console.log(`\n✅ Approving all ${requests.length} pending requests...\n`);
    
    for (const req of requests) {
      await processRequest(req.id, 'approve', 'Bulk approval - test');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Approved ${requests.length} request(s)!`);
    
  } else if (args[0] === 'reject-all') {
    const requests = await listPendingRequests();
    console.log(`\n❌ Rejecting all ${requests.length} pending requests...\n`);
    
    for (const req of requests) {
      await processRequest(req.id, 'reject', 'Bulk rejection - test');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n❌ Rejected ${requests.length} request(s)!`);
    
  } else if (args[0] === 'approve' && args[1]) {
    await processRequest(args[1], 'approve');
    
  } else if (args[0] === 'reject' && args[1]) {
    await processRequest(args[1], 'reject');
    
  } else {
    console.log('Usage:');
    console.log('  npx tsx approve-reject-requests.ts                    # List pending');
    console.log('  npx tsx approve-reject-requests.ts approve REQUEST_ID');
    console.log('  npx tsx approve-reject-requests.ts reject REQUEST_ID');
    console.log('  npx tsx approve-reject-requests.ts approve-all');
    console.log('  npx tsx approve-reject-requests.ts reject-all');
  }
}

main();

