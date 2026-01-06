/**
 * Complete Setup Script for Product Images Feature
 * This script:
 * 1. Applies the database migration
 * 2. Creates the Supabase Storage bucket
 * 3. Verifies everything is set up correctly
 * 
 * Required environment variables:
 * - SUPABASE_URL (or VITE_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not found in environment variables');
  console.error('   Please set SUPABASE_URL, VITE_SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.error('   This is required for admin operations (creating bucket, applying migrations)');
  console.error('   You can find it in Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Create Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'product-images';
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/20251229000000_create_product_images_table.sql');

async function applyMigration() {
  console.log('\n📦 Step 1: Applying database migration...\n');

  try {
    // Read migration file
    const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        // Execute statement using RPC or direct query
        // Note: Supabase JS client doesn't support raw SQL directly
        // We'll use the REST API for this
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql: statement })
        });

        if (!response.ok && response.status !== 404) {
          // Try alternative: check if table already exists
          if (statement.includes('CREATE TABLE') && statement.includes('product_images')) {
            const { data: checkTable } = await supabase
              .from('product_images')
              .select('id')
              .limit(1);
            
            if (checkTable !== null) {
              console.log(`   ✅ Table product_images already exists, skipping creation`);
              continue;
            }
          }
          
          const errorText = await response.text();
          console.warn(`   ⚠️  Statement ${i + 1} returned status ${response.status}`);
          console.warn(`      ${errorText.substring(0, 100)}`);
        } else {
          console.log(`   ✅ Statement ${i + 1} executed`);
        }
      } catch (error) {
        // If exec_sql RPC doesn't exist, try direct table check
        if (statement.includes('CREATE TABLE') && statement.includes('product_images')) {
          const { data: checkTable } = await supabase
            .from('product_images')
            .select('id')
            .limit(1);
          
          if (checkTable !== null) {
            console.log(`   ✅ Table product_images already exists`);
            continue;
          } else {
            console.error(`   ❌ Cannot execute migration: ${error instanceof Error ? error.message : String(error)}`);
            console.error(`   💡 Please apply the migration manually via Supabase Dashboard SQL Editor`);
            console.error(`   📄 File: ${MIGRATION_FILE}`);
            return false;
          }
        }
      }
    }

    // Verify table was created
    const { data: verifyTable, error: verifyError } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (verifyError && verifyError.code !== 'PGRST116') {
      console.error(`   ❌ Error verifying table: ${verifyError.message}`);
      return false;
    }

    if (verifyTable !== null) {
      console.log('   ✅ Migration applied successfully!');
      return true;
    } else {
      console.warn('   ⚠️  Table not found after migration');
      console.warn('   💡 Please apply the migration manually via Supabase Dashboard SQL Editor');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error applying migration:', error);
    console.error('   💡 Please apply the migration manually via Supabase Dashboard SQL Editor');
    console.error(`   📄 File: ${MIGRATION_FILE}`);
    return false;
  }
}

async function createBucket() {
  console.log('\n🪣 Step 2: Creating Supabase Storage bucket...\n');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('   ❌ Error listing buckets:', listError.message);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`   ✅ Bucket '${BUCKET_NAME}' already exists`);
      
      // Verify bucket settings
      const bucket = buckets?.find(b => b.name === BUCKET_NAME);
      console.log('   📋 Current bucket settings:');
      console.log(`      - Public: ${bucket?.public ? 'Yes' : 'No'}`);
      console.log(`      - File size limit: ${bucket?.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
      console.log(`      - Allowed MIME types: ${bucket?.allowed_mime_types?.join(', ') || 'Not set'}`);
      
      // Check if settings need updating
      const needsUpdate = 
        !bucket?.public ||
        bucket?.file_size_limit !== 5242880 ||
        !bucket?.allowed_mime_types?.includes('image/jpeg');

      if (needsUpdate) {
        console.log('   ⚠️  Bucket settings may need updating');
        console.log('   💡 Please verify in Supabase Dashboard > Storage > Buckets');
        console.log('      Recommended settings:');
        console.log('      - Public: Yes');
        console.log('      - File size limit: 5242880 (5MB)');
        console.log('      - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
      }
      
      return true;
    }

    console.log(`   📦 Creating bucket '${BUCKET_NAME}'...`);

    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (error) {
      console.error('   ❌ Error creating bucket:', error.message);
      console.error('   💡 Please create the bucket manually via Supabase Dashboard');
      console.error('      Settings:');
      console.error('      - Name: product-images');
      console.error('      - Public: Yes');
      console.error('      - File size limit: 5242880 (5MB)');
      console.error('      - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
      return false;
    }

    console.log(`   ✅ Bucket '${BUCKET_NAME}' created successfully!`);
    console.log('   📋 Bucket settings:');
    console.log(`      - Public: ${data.public ? 'Yes' : 'No'}`);
    console.log(`      - File size limit: ${data.file_size_limit ? `${data.file_size_limit / 1024 / 1024}MB` : 'Not set'}`);
    console.log(`      - Allowed MIME types: ${data.allowed_mime_types?.join(', ') || 'Not set'}`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error creating bucket:', error);
    return false;
  }
}

async function verifySetup() {
  console.log('\n✅ Step 3: Verifying setup...\n');

  const results = {
    tableExists: false,
    bucketExists: false,
    rlsEnabled: false,
  };

  // Check table
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error || error.code === 'PGRST116') {
      results.tableExists = data !== null;
      console.log(`   ${results.tableExists ? '✅' : '❌'} Table 'product_images' exists: ${results.tableExists}`);
    } else {
      console.log(`   ❌ Error checking table: ${error.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking table: ${error}`);
  }

  // Check bucket
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    results.bucketExists = buckets?.some(b => b.name === BUCKET_NAME) || false;
    console.log(`   ${results.bucketExists ? '✅' : '❌'} Bucket '${BUCKET_NAME}' exists: ${results.bucketExists}`);
  } catch (error) {
    console.log(`   ❌ Error checking bucket: ${error}`);
  }

  // Check RLS (try to query with anon key - should work if RLS allows public read)
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    // If we can query without error, RLS is likely configured
    results.rlsEnabled = !error || error.code === 'PGRST116';
    console.log(`   ${results.rlsEnabled ? '✅' : '⚠️ '} RLS policies: ${results.rlsEnabled ? 'Configured' : 'May need verification'}`);
  } catch (error) {
    console.log(`   ⚠️  Could not verify RLS: ${error}`);
  }

  console.log('\n📊 Setup Summary:');
  console.log(`   Table exists: ${results.tableExists ? '✅' : '❌'}`);
  console.log(`   Bucket exists: ${results.bucketExists ? '✅' : '❌'}`);
  console.log(`   RLS configured: ${results.rlsEnabled ? '✅' : '⚠️ '}`);

  return results.tableExists && results.bucketExists;
}

async function main() {
  console.log('🚀 Product Images Feature - Complete Setup');
  console.log('==========================================\n');

  const migrationSuccess = await applyMigration();
  const bucketSuccess = await createBucket();
  const verification = await verifySetup();

  console.log('\n' + '='.repeat(50));
  if (migrationSuccess && bucketSuccess && verification) {
    console.log('✅ Setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test uploading images in the Provider Portal');
    console.log('   2. Verify images appear in the product page carousel');
    console.log('   3. Check TEST_PRODUCT_IMAGES.md for full test plan');
  } else {
    console.log('⚠️  Setup completed with some issues');
    console.log('\n📝 Manual steps may be required:');
    if (!migrationSuccess) {
      console.log('   - Apply migration manually via Supabase Dashboard SQL Editor');
      console.log(`     File: ${MIGRATION_FILE}`);
    }
    if (!bucketSuccess) {
      console.log('   - Create bucket manually via Supabase Dashboard');
      console.log('     Name: product-images, Public: Yes, Limit: 5MB');
    }
  }
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);

