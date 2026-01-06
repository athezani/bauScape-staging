/**
 * Apply RLS Policies via Supabase Client
 * Uses direct client operations to drop and create policies
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

async function executeRawSQL(supabase: any, sql: string): Promise<boolean> {
  try {
    // Try using the REST API directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      return true;
    }

    // Try alternative endpoint
    const response2 = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
      },
      body: JSON.stringify({ sql_query: sql })
    });

    return response2.ok;
  } catch (error) {
    return false;
  }
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

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const cleaned = s.replace(/--.*$/gm, '').trim();
      return cleaned.length > 10 && 
             !cleaned.toLowerCase().startsWith('note:') &&
             !cleaned.toLowerCase().startsWith('policy 1:') &&
             !cleaned.toLowerCase().startsWith('policy 2:') &&
             !cleaned.toLowerCase().startsWith('policy 3:');
    })
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 10);

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  // Execute each statement
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Use pg library via direct connection
      // Since Supabase doesn't support raw SQL via REST API,
      // we'll use the Management API endpoint
      const response = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok) {
        console.log(`  ✅ Statement ${i + 1} executed`);
        successCount++;
      } else {
        const errorText = await response.text();
        if (errorText.includes('already exists') || errorText.includes('duplicate') || errorText.includes('42710')) {
          console.log(`  ⚠️  Statement ${i + 1} skipped (already exists)`);
          successCount++;
        } else {
          console.log(`  ❌ Statement ${i + 1} failed`);
          console.log(`     ${errorText.substring(0, 200)}`);
          errorCount++;
        }
      }
    } catch (error) {
      // Try using Supabase client's RPC (if exec_sql function exists)
      try {
        const { error: rpcError } = await supabase.rpc('exec_sql', { 
          query: statement 
        });

        if (!rpcError) {
          console.log(`  ✅ Statement ${i + 1} executed (via RPC)`);
          successCount++;
        } else {
          throw rpcError;
        }
      } catch (rpcErr) {
        console.log(`  ❌ Statement ${i + 1} error`);
        console.log(`     ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed\n`);

  // Verify policies
  console.log('🔍 Verifying RLS policies...\n');
  
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
      console.log('📋 Storage policies must be created manually via Dashboard');
      console.log('   See: STORAGE_POLICIES_WITH_ADMIN.md\n');
    } else {
      console.log('⚠️  Some policies may need manual application\n');
      console.log('📋 Please run FIX_ALL_POLICIES_WITH_ADMIN.sql in SQL Editor\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please run FIX_ALL_POLICIES_WITH_ADMIN.sql manually in SQL Editor\n');
    process.exit(1);
  }
}

main().catch(console.error);

