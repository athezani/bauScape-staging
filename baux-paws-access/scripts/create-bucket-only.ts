/**
 * Create Product Images Bucket
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
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

async function createBucket() {
  console.log('🪣 Creating Product Images Bucket...\n');

  if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not found');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    console.error('\n📝 To add it:');
    console.error('   1. Go to Supabase Dashboard > Settings > API');
    console.error('   2. Copy the "service_role" key');
    console.error('   3. Add to .env.local:');
    console.error('      SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists!`);
      const bucket = buckets?.find(b => b.name === BUCKET_NAME);
      console.log('\n📋 Current settings:');
      console.log(`   - Public: ${bucket?.public ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   - File size limit: ${bucket?.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
      console.log(`   - Allowed MIME types: ${bucket?.allowed_mime_types?.join(', ') || 'Not set'}`);
      return;
    }

    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);

    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      process.exit(1);
    }

    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully!`);
    console.log('\n📋 Bucket settings:');
    console.log(`   - Public: ${data.public ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   - File size limit: ${data.file_size_limit ? `${data.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
    console.log(`   - Allowed MIME types: ${data.allowed_mime_types?.join(', ') || 'Not set'}`);
    
    console.log('\n✅ Setup complete! You can now upload images in the Provider Portal.');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createBucket();

