/**
 * Apply RLS Policies via Supabase Management API
 * Uses the SQL execution endpoint
 */

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

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing credentials');
  }

  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error('Invalid SUPABASE_URL format');
  }

  // Use Supabase Management API
  // The SQL endpoint is at: https://api.supabase.com/v1/projects/{ref}/database/query
  const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  try {
    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    // Management API might not be available, try direct SQL execution via REST
    // Use the SQL Editor endpoint (if available)
    const sqlEditorUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec_sql`;
    
    try {
      const response2 = await fetch(sqlEditorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ 
          query: sql,
          sql: sql
        })
      });

      if (response2.ok) {
        return { success: true };
      } else {
        const errorText = await response2.text();
        return { success: false, error: errorText };
      }
    } catch (error2) {
      return { 
        success: false, 
        error: `Management API error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

async function applyRLSPolicies() {
  console.log('🔧 Applying RLS Policies with Admin Support...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Read SQL file
  const sqlFile = join(__dirname, '../FIX_ALL_POLICIES_WITH_ADMIN.sql');
  let sql = readFileSync(sqlFile, 'utf-8');

  // Extract only RLS policies (before storage policies section)
  const storageSectionIndex = sql.indexOf('-- ============================================================');
  if (storageSectionIndex > 0) {
    sql = sql.substring(0, storageSectionIndex);
  }

  // Clean up SQL - remove comments
  sql = sql.replace(/--.*$/gm, '').trim();

  console.log('📝 Executing RLS policies SQL...\n');

  const result = await executeSQL(sql);

  if (result.success) {
    console.log('✅ RLS Policies applied successfully!\n');
    return true;
  } else {
    console.log('❌ Failed to apply RLS policies');
    console.log(`   Error: ${result.error?.substring(0, 300)}\n`);
    
    // If Management API doesn't work, we need to use SQL Editor
    console.log('💡 Management API not available. Please run SQL manually:\n');
    console.log('   1. Go to: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('   2. Copy the SQL from: FIX_ALL_POLICIES_WITH_ADMIN.sql');
    console.log('   3. Execute it\n');
    
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
      console.log('✅ All RLS Policies applied!\n');
      console.log('📋 Next: Create storage policies manually via Dashboard');
      console.log('   See: STORAGE_POLICIES_WITH_ADMIN.md\n');
    } else {
      console.log('⚠️  Please apply RLS policies manually via SQL Editor\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please run FIX_ALL_POLICIES_WITH_ADMIN.sql manually in SQL Editor\n');
    process.exit(1);
  }
}

main().catch(console.error);

