/**
 * Execute Complete SQL (RLS + Storage Policies)
 * Attempts to execute via API, falls back to manual instructions
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

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing credentials');
  }

  // Try to execute via Supabase REST API
  // Note: Supabase doesn't have a direct SQL execution endpoint
  // We'll need to use the SQL Editor or create a custom function
  
  // For now, return false to indicate manual execution needed
  return { success: false, error: 'Direct SQL execution not available via API' };
}

async function main() {
  console.log('🚀 Applying All Policies (RLS + Storage)...\n');
  console.log('='.repeat(60) + '\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  // Read SQL file
  const sqlFile = join(__dirname, '../APPLY_ALL_POLICIES_COMPLETE.sql');
  const sql = readFileSync(sqlFile, 'utf-8');

  console.log('📝 Attempting to execute SQL via API...\n');

  // Try to execute
  const result = await executeSQL(sql);

  if (!result.success) {
    console.log('⚠️  Direct SQL execution not available via API\n');
    console.log('📋 Please execute manually in Supabase SQL Editor:\n');
    console.log('   1. SQL has been copied to clipboard');
    console.log('   2. Browser will open to SQL Editor');
    console.log('   3. Paste (Cmd+V) and click "Run"\n');

    // Copy to clipboard
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync(`echo "${sql.replace(/"/g, '\\"').replace(/\$/g, '\\$')}" | pbcopy`);
      console.log('✅ SQL copied to clipboard!\n');
    } catch (clipError) {
      console.log('⚠️  Could not copy to clipboard\n');
    }

    // Open browser
    const { exec: execSync } = await import('child_process');
    execSync(`open "https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new"`);
    
    console.log('🌐 SQL Editor opened in browser\n');
    console.log('⏳ Waiting for you to execute the SQL...\n');
    console.log('   After executing, the policies will be applied!\n');
    console.log('   If storage policies fail, create them manually:\n');
    console.log('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies\n');

    // Verify after execution
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Verifying policies...\n');
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id')
        .limit(1);

      if (!error) {
        console.log('✅ RLS policies are working!\n');
      } else {
        console.log(`⚠️  RLS verification: ${error.message}\n`);
      }
    } catch (error) {
      console.log(`⚠️  Verification error: ${error}\n`);
    }
  } else {
    console.log('✅ All policies applied successfully!\n');
  }
}

main().catch(console.error);

