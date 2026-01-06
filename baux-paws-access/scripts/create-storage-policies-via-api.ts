/**
 * Create Storage Policies via Supabase API
 * Attempts to create storage policies directly via REST API
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
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

async function createStoragePolicy(policy: {
  name: string;
  operation: string;
  definition: string;
}): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing credentials');
  }

  // Extract project ref
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error('Invalid SUPABASE_URL');
  }

  // Try to create policy via SQL execution
  // Storage policies are stored in storage.policies table
  const sql = `
CREATE POLICY "${policy.name.replace(/"/g, '""')}"
ON storage.objects
FOR ${policy.operation}
${policy.operation === 'INSERT' ? 'WITH CHECK' : 'USING'} (
${policy.definition}
);
`.trim();

  // Use Supabase REST API to execute SQL
  try {
    // Try Management API
    const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    const response = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      return true;
    }

    // Try alternative: Direct REST API
    const restUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    const response2 = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql, sql: sql })
    });

    return response2.ok;
  } catch (error) {
    console.log(`   Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating Storage Policies via API...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

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

  console.log(`📝 Creating ${policies.length} storage policies...\n`);

  let successCount = 0;
  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`Policy ${i + 1}/${policies.length}: ${policy.name}`);
    
    const success = await createStoragePolicy(policy);
    if (success) {
      console.log(`  ✅ Created successfully\n`);
      successCount++;
    } else {
      console.log(`  ⚠️  Could not create via API (may already exist or need manual creation)\n`);
    }
  }

  console.log('='.repeat(60));
  console.log(`📊 Results: ${successCount}/${policies.length} policies created\n`);

  if (successCount < policies.length) {
    console.log('📋 Some policies may need manual creation via Dashboard:');
    console.log('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies\n');
    console.log('   See: STORAGE_POLICIES_WITH_ADMIN.md for definitions\n');
  } else {
    console.log('✅ All storage policies created!\n');
  }
}

main().catch(console.error);
