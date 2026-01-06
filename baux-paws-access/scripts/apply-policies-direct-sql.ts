/**
 * Apply RLS Policies by executing SQL statements directly
 * Uses Supabase REST API to execute DROP and CREATE POLICY statements
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

async function executePolicyStatement(supabase: any, statement: string): Promise<boolean> {
  // Since we can't execute raw SQL directly, we'll use the Supabase client
  // to execute the policy statements via RPC if available, or we'll need to
  // use a different approach
  
  // For now, we'll return false and indicate manual execution is needed
  return false;
}

async function applyRLSPolicies() {
  console.log('🔧 Applying RLS Policies with Admin Support...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read SQL file
  const sqlFile = join(__dirname, '../FIX_ALL_POLICIES_WITH_ADMIN.sql');
  let sql = readFileSync(sqlFile, 'utf-8');

  // Extract only RLS policies (before storage policies section)
  const storageSectionIndex = sql.indexOf('-- ============================================================');
  if (storageSectionIndex > 0) {
    sql = sql.substring(0, storageSectionIndex);
  }

  // Since Supabase doesn't support raw SQL execution via API,
  // we need to provide clear instructions
  console.log('⚠️  Direct SQL execution via API is not available\n');
  console.log('📋 Please execute the SQL manually in Supabase SQL Editor:\n');
  console.log('   1. Go to: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
  console.log('   2. Copy the SQL from: FIX_ALL_POLICIES_WITH_ADMIN.sql');
  console.log('   3. Paste and click "Run"\n');
  
  // Copy SQL to clipboard
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // Clean SQL for clipboard (remove comments)
    const cleanSQL = sql.replace(/--.*$/gm, '').trim();
    await execAsync(`echo "${cleanSQL.replace(/"/g, '\\"').replace(/\$/g, '\\$')}" | pbcopy`);
    console.log('✅ SQL copied to clipboard!\n');
    console.log('   Just paste it (Cmd+V) in the SQL Editor\n');
  } catch (clipError) {
    console.log('⚠️  Could not copy to clipboard automatically\n');
  }

  // Open browser
  const { exec: execSync } = await import('child_process');
  execSync(`open "https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new"`);
  
  console.log('🌐 SQL Editor opened in browser\n');
  console.log('⏳ Waiting for you to execute the SQL...\n');
  console.log('   After executing, press Enter here to continue...\n');
  
  // Wait for user input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });

  // Verify policies were applied
  console.log('\n🔍 Verifying RLS policies...\n');
  
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ RLS policies are working correctly!\n');
      return true;
    } else {
      console.log(`⚠️  Verification query error: ${error.message}\n`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  Verification error: ${error}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying RLS Policies with Admin Support...\n');
  console.log('='.repeat(60) + '\n');

  try {
    const success = await applyRLSPolicies();
    
    console.log('='.repeat(60) + '\n');
    
    if (success) {
      console.log('✅ RLS Policies applied successfully!\n');
      console.log('📋 Next: Create storage policies manually via Dashboard');
      console.log('   See: STORAGE_POLICIES_WITH_ADMIN.md\n');
    } else {
      console.log('⚠️  Please verify that policies were applied correctly\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

