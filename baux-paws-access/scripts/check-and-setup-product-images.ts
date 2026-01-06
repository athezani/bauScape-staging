/**
 * Check and Setup Product Images Feature
 * This script checks what's already set up and provides instructions for what's missing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
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
      
      // Remove quotes if present
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

// Try to load .env files
const envLocalPath = join(__dirname, '../.env.local');
const envPath = join(__dirname, '../.env');

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
}
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME = 'product-images';

async function checkSetup() {
  console.log('🔍 Checking Product Images Setup...\n');
  console.log('='.repeat(60));

  // Check credentials
  console.log('\n📋 Step 1: Checking Credentials\n');
  
  if (!SUPABASE_URL) {
    console.log('❌ SUPABASE_URL not found');
    console.log('   Please set SUPABASE_URL, VITE_SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_URL');
    return;
  }
  console.log(`✅ SUPABASE_URL found: ${SUPABASE_URL.substring(0, 30)}...`);

  if (!SUPABASE_ANON_KEY) {
    console.log('⚠️  SUPABASE_ANON_KEY not found (not critical for setup)');
  } else {
    console.log(`✅ SUPABASE_ANON_KEY found`);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found');
    console.log('   This is needed for creating bucket and applying migrations');
    console.log('   You can find it in: Supabase Dashboard > Settings > API > service_role key');
  } else {
    console.log(`✅ SUPABASE_SERVICE_ROLE_KEY found`);
  }

  // Create client (use service role if available, otherwise anon)
  const client = SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  if (!client) {
    console.log('\n❌ Cannot proceed without at least SUPABASE_URL and one key');
    return;
  }

  // Check database table
  console.log('\n📦 Step 2: Checking Database Table\n');
  
  try {
    const { data, error } = await client
      .from('product_images')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('❌ Table "product_images" does not exist');
        console.log('   📄 Migration file: supabase/migrations/20251229000000_create_product_images_table.sql');
        console.log('   💡 To apply:');
        console.log('      1. Go to Supabase Dashboard > SQL Editor');
        console.log('      2. Copy the migration file content');
        console.log('      3. Paste and execute');
      } else {
        console.log(`⚠️  Error checking table: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
    } else {
      console.log('✅ Table "product_images" exists');
      
      // Check RLS
      try {
        const { count } = await client
          .from('product_images')
          .select('*', { count: 'exact', head: true });
        console.log(`   📊 RLS allows public read: ${count !== null ? 'Yes' : 'No'}`);
      } catch (e) {
        console.log('   ⚠️  Could not verify RLS policies');
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }

  // Check storage bucket
  console.log('\n🪣 Step 3: Checking Storage Bucket\n');
  
  try {
    const { data: buckets, error } = await client.storage.listBuckets();

    if (error) {
      console.log(`⚠️  Error listing buckets: ${error.message}`);
      if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.log('   💡 This might require SERVICE_ROLE_KEY');
      }
    } else {
      const bucket = buckets?.find(b => b.name === BUCKET_NAME);
      
      if (bucket) {
        console.log(`✅ Bucket "${BUCKET_NAME}" exists`);
        console.log(`   📋 Settings:`);
        console.log(`      - Public: ${bucket.public ? 'Yes ✅' : 'No ❌'}`);
        console.log(`      - File size limit: ${bucket.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
        console.log(`      - Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'Not set'}`);
        
        // Check if settings are correct
        const needsUpdate = 
          !bucket.public ||
          bucket.file_size_limit !== 5242880 ||
          !bucket.allowed_mime_types?.includes('image/jpeg');

        if (needsUpdate) {
          console.log(`\n   ⚠️  Bucket settings may need updating:`);
          console.log(`      Recommended:`);
          console.log(`      - Public: Yes`);
          console.log(`      - File size limit: 5242880 (5MB)`);
          console.log(`      - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp`);
        }
      } else {
        console.log(`❌ Bucket "${BUCKET_NAME}" does not exist`);
        console.log(`   💡 To create:`);
        if (SUPABASE_SERVICE_ROLE_KEY) {
          console.log(`      Run: npx tsx scripts/setup-product-images-bucket.ts`);
        } else {
          console.log(`      1. Go to Supabase Dashboard > Storage > Buckets`);
          console.log(`      2. Click "New bucket"`);
          console.log(`      3. Name: ${BUCKET_NAME}`);
          console.log(`      4. Public: Yes`);
          console.log(`      5. File size limit: 5242880 (5MB)`);
          console.log(`      6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp`);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error checking bucket: ${error}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary\n');
  
  const migrationFile = join(__dirname, '../supabase/migrations/20251229000000_create_product_images_table.sql');
  const migrationExists = existsSync(migrationFile);
  
  console.log(`Migration file: ${migrationExists ? '✅ Exists' : '❌ Not found'}`);
  console.log(`Database table: ${await checkTableExists(client) ? '✅ Exists' : '❌ Missing'}`);
  console.log(`Storage bucket: ${await checkBucketExists(client) ? '✅ Exists' : '❌ Missing'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Next Steps:\n');
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
    console.log('   (Find it in: Supabase Dashboard > Settings > API > service_role key)\n');
  }
  
  if (!await checkTableExists(client)) {
    console.log('2. Apply database migration:');
    console.log('   - Go to Supabase Dashboard > SQL Editor');
    console.log(`   - Copy content from: ${migrationFile}`);
    console.log('   - Paste and execute\n');
  }
  
  if (!await checkBucketExists(client)) {
    console.log('3. Create storage bucket (see instructions above)\n');
  }
  
  if (await checkTableExists(client) && await checkBucketExists(client)) {
    console.log('✅ Everything is set up! You can now:');
    console.log('   - Upload images in Provider Portal');
    console.log('   - View images in product page carousel');
  }
}

async function checkTableExists(client: any): Promise<boolean> {
  try {
    const { error } = await client
      .from('product_images')
      .select('id')
      .limit(1);
    return !error || error.code !== 'PGRST116';
  } catch {
    return false;
  }
}

async function checkBucketExists(client: any): Promise<boolean> {
  try {
    const { data: buckets } = await client.storage.listBuckets();
    return buckets?.some(b => b.name === BUCKET_NAME) || false;
  } catch {
    return false;
  }
}

checkSetup().catch(console.error);

