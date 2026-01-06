import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendAllEmails() {
  console.log('📧 Sending emails for all 10 cancellation requests...\n');
  
  // Get all pending requests
  const { data: requests } = await supabase
    .from('cancellation_request')
    .select('id, booking_id, order_number')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(10);

  if (!requests || requests.length === 0) {
    console.log('❌ No pending requests found');
    return;
  }

  console.log(`Found ${requests.length} pending requests\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    console.log(`[${i + 1}/${requests.length}] Sending email for ${req.order_number}...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({
          type: 'cancellation_request_admin',
          requestId: req.id,
          bookingId: req.booking_id,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`  ✅ Email sent successfully!`);
        successCount++;
      } else {
        console.log(`  ❌ Failed: ${data.error || data.message || JSON.stringify(data)}`);
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
    
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully sent: ${successCount}/${requests.length}`);
  console.log(`❌ Failed: ${failCount}/${requests.length}`);
  console.log(`\n📧 Check a.thezani@gmail.com for ${successCount} email(s)!`);
}

sendAllEmails();

