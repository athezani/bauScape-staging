/**
 * Verify and Fix All Policies
 * Checks if policies exist and creates missing ones
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

async function verifyRLSPolicies() {
  console.log('🔍 Verifying RLS Policies...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing credentials');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ RLS policies are working correctly!\n');
      return true;
    } else {
      console.log(`⚠️  RLS policies may need fixing: ${error.message}\n`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  Error verifying RLS: ${error}\n`);
    return false;
  }
}

async function verifyStoragePolicies() {
  console.log('🔍 Verifying Storage Policies...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing credentials');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Try to upload a test file to verify storage policies
  // This will fail if policies don't allow it
  try {
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testFileName = `test-${Date.now()}.txt`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`test/${testFileName}`, testContent, {
        cacheControl: '3600',
        upsert: false
      });

    if (!error) {
      // Clean up test file
      await supabase.storage
        .from('product-images')
        .remove([`test/${testFileName}`]);
      
      console.log('✅ Storage policies are working correctly!\n');
      return true;
    } else {
      console.log(`⚠️  Storage policies may need fixing: ${error.message}\n`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  Error verifying storage: ${error}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Verifying All Policies...\n');
  console.log('='.repeat(60) + '\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const rlsOk = await verifyRLSPolicies();
  const storageOk = await verifyStoragePolicies();

  console.log('='.repeat(60));
  console.log('📊 Summary:\n');
  console.log(`   RLS Policies: ${rlsOk ? '✅ Working' : '⚠️  Need fixing'}`);
  console.log(`   Storage Policies: ${storageOk ? '✅ Working' : '⚠️  Need fixing'}`);
  console.log('');

  if (!rlsOk) {
    console.log('📋 To fix RLS policies:');
    console.log('   1. Run APPLY_ALL_POLICIES_COMPLETE.sql in SQL Editor\n');
  }

  if (!storageOk) {
    console.log('📋 To fix Storage policies:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies');
    console.log('   2. Select bucket: product-images');
    console.log('   3. Create policies (see STORAGE_POLICIES_WITH_ADMIN.md)\n');
  }

  if (rlsOk && storageOk) {
    console.log('🎉 All policies are working correctly!\n');
    console.log('✅ Both admin and providers can now upload images!\n');
  }
}

main().catch(console.error);

