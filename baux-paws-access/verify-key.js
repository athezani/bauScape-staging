/**
 * Script to verify if the Service Role Key is correct
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Verifying Service Role Key ===');
console.log('');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in environment');
  console.error('');
  console.error('Please set it with:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('  or');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key_here node verify-key.js');
  process.exit(1);
}

console.log('✅ Service Role Key found');
console.log('   Length:', SUPABASE_SERVICE_KEY.length);
console.log('   First 20 chars:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
console.log('   Last 10 chars:', '...' + SUPABASE_SERVICE_KEY.substring(SUPABASE_SERVICE_KEY.length - 10));
console.log('');

// Verify the key by making a simple request
async function verifyKey() {
  try {
    console.log('Testing key with a simple database query...');
    
    // Try to query a public table (like profile) with service role key
    const testUrl = `${SUPABASE_URL}/rest/v1/profile?select=id&limit=1`;
    
    const response = await fetch(testUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('✅ Service Role Key is VALID!');
      console.log('   Status:', response.status);
      const data = await response.json();
      console.log('   Test query successful');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Service Role Key is INVALID');
      console.error('   Status:', response.status);
      console.error('   Error:', errorText);
      console.error('');
      console.error('Please check:');
      console.error('  1. The key is the "service_role" key (not "anon" key)');
      console.error('  2. The key is copied correctly (no extra spaces)');
      console.error('  3. You got it from: Supabase Dashboard → Settings → API → service_role');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing key:', error.message);
    return false;
  }
}

verifyKey().then(isValid => {
  if (isValid) {
    console.log('');
    console.log('✅ Key verification successful! You can now run:');
    console.log('   node test-email-simple.js');
  } else {
    process.exit(1);
  }
});




