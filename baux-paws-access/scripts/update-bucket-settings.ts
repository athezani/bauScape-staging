/**
 * Update Product Images Bucket Settings
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile(join(__dirname, '../.env.local'));
loadEnvFile(join(__dirname, '../.env'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'product-images';

async function updateBucket() {
  console.log('🔧 Updating Product Images Bucket Settings...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Note: Supabase JS client doesn't support updating bucket settings directly
    // We need to use the REST API
    console.log('📝 Note: Bucket settings update requires REST API...');
    console.log('💡 Please update manually via Supabase Dashboard:\n');
    console.log('   1. Go to Storage > Buckets > product-images');
    console.log('   2. Click "Edit bucket"');
    console.log('   3. Set:');
    console.log('      - Public: Yes');
    console.log('      - File size limit: 5242880 (5MB)');
    console.log('      - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
    console.log('   4. Save\n');
    
    // Try to make it public via REST API
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        public: true,
        file_size_limit: 5242880,
        allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bucket settings updated successfully!');
      console.log('\n📋 Updated settings:');
      console.log(`   - Public: ${data.public ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   - File size limit: ${data.file_size_limit ? `${data.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
      console.log(`   - Allowed MIME types: ${data.allowed_mime_types?.join(', ') || 'Not set'}`);
    } else {
      const errorText = await response.text();
      console.log('⚠️  Could not update via API (this is normal)');
      console.log('   Please update manually via Dashboard (see instructions above)');
    }

    // Verify current settings
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    
    if (bucket) {
      console.log('\n📋 Current bucket settings:');
      console.log(`   - Public: ${bucket.public ? 'Yes ✅' : 'No ❌ (needs update)'}`);
      console.log(`   - File size limit: ${bucket.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024}MB` : 'Not set (needs update)'}`);
      console.log(`   - Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'Not set (needs update)'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateBucket();

