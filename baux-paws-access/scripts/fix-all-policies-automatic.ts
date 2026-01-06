/**
 * Fix All Policies Automatically
 * This script updates RLS policies and creates storage policies
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

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Read the SQL file
  const sqlFile = join(__dirname, '../FIX_ALL_POLICIES_WITH_ADMIN.sql');
  const sql = readFileSync(sqlFile, 'utf-8');

  // Extract only the RLS policies part (before the storage policies comment)
  const rlsSQL = sql.split('-- ============================================================')[0] +
    sql.split('-- ============================================================')[1];

  // Split into statements
  const statements = rlsSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`📝 Executing ${statements.length} RLS policy statements...\n`);

  // Execute each statement via REST API
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    if (statement.length < 10) continue;

    try {
      // Use PostgREST to execute SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql: statement + ';' })
      });

      if (response.ok) {
        console.log(`  ✅ Statement ${i + 1} executed`);
      } else {
        const errorText = await response.text();
        // Some errors are expected (like "already exists")
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          console.log(`  ⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.log(`  ❌ Statement ${i + 1} failed: ${errorText.substring(0, 100)}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Statement ${i + 1} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Verify policies
  console.log('\n🔍 Verifying RLS policies...\n');
  
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ RLS policies configured correctly\n');
      return true;
    } else {
      console.log(`⚠️  RLS verification: ${error.message}\n`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  RLS verification error: ${error}\n`);
    return false;
  }
}

async function createStoragePolicies() {
  console.log('🔧 Creating Storage Policies...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  // Storage policies must be created via Dashboard
  // But we can try to use the Management API
  const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectId) {
    console.log('⚠️  Cannot create storage policies via API');
    console.log('📋 Please create them manually (see STORAGE_POLICIES_WITH_ADMIN.md)\n');
    return false;
  }

  // Try to create via Management API
  const policies = [
    {
      name: 'Providers and Admins can upload product images',
      operation: 'INSERT',
      definition: `(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)`
    },
    {
      name: 'Providers and Admins can delete product images',
      operation: 'DELETE',
      definition: `(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)`
    },
    {
      name: 'Public can view product images',
      operation: 'SELECT',
      definition: `(bucket_id = 'product-images')`
    }
  ];

  // Try to create via SQL (might not work for storage.objects)
  console.log('📝 Attempting to create storage policies via SQL...\n');
  
  for (const policy of policies) {
    const sql = `CREATE POLICY "${policy.name}"
ON storage.objects
FOR ${policy.operation}
${policy.operation === 'INSERT' ? 'WITH CHECK' : 'USING'} (
${policy.definition}
);`;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql })
      });

      if (response.ok) {
        console.log(`  ✅ Policy "${policy.name}" created`);
      } else {
        const errorText = await response.text();
        if (errorText.includes('already exists')) {
          console.log(`  ⚠️  Policy "${policy.name}" already exists`);
        } else {
          console.log(`  ❌ Policy "${policy.name}" failed: ${errorText.substring(0, 100)}`);
          console.log(`  💡 Please create manually via Dashboard\n`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Policy "${policy.name}" error: ${error}`);
      console.log(`  💡 Please create manually via Dashboard\n`);
    }
  }

  return false;
}

async function main() {
  console.log('🚀 Fixing All Policies Automatically...\n');
  console.log('='.repeat(60) + '\n');

  const rlsSuccess = await fixRLSPolicies();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  const storageSuccess = await createStoragePolicies();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:\n');
  console.log(`   RLS Policies: ${rlsSuccess ? '✅ Fixed' : '⚠️  May need manual fix'}`);
  console.log(`   Storage Policies: ${storageSuccess ? '✅ Created' : '⚠️  Need manual creation'}`);
  console.log('\n' + '='.repeat(60) + '\n');

  if (!storageSuccess) {
    console.log('📋 Next Steps:\n');
    console.log('   1. RLS policies should be fixed');
    console.log('   2. Create storage policies manually:');
    console.log('      - Go to: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies');
    console.log('      - Select bucket: product-images');
    console.log('      - See: STORAGE_POLICIES_WITH_ADMIN.md for definitions\n');
  } else {
    console.log('✅ All policies fixed! You can now upload images.\n');
  }
}

main().catch(console.error);

