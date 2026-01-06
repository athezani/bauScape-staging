/**
 * Apply Migration using direct PostgreSQL connection
 */

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
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/20251229000000_create_product_images_table.sql');

async function applyMigration() {
  console.log('🚀 Applying Product Images Migration via PostgreSQL...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
  
  // Extract project ID
  const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectId) {
    console.error('❌ Could not extract project ID');
    process.exit(1);
  }

  // Build connection string
  // We need to decode the JWT to get the database password
  // For now, we'll use the Supabase JS client which handles this
  
  console.log('📝 Using Supabase client to execute migration...\n');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if table exists first
    const { data: existing, error: checkError } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table "product_images" already exists!\n');
      return true;
    }

    // Table doesn't exist, we need to create it
    // Since Supabase JS doesn't support raw SQL, we'll use the REST API
    // with a workaround: create a temporary function that executes SQL
    
    console.log('📤 Creating table via REST API...\n');
    
    // Split SQL into executable chunks
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith('--'));

    // Execute each statement via REST API using a helper function
    // We'll create a temporary function in the database that can execute SQL
    
    // Actually, the best approach is to use psql if available
    // Or use the Supabase Management API with proper authentication
    
    console.log('⚠️  Direct SQL execution not available via JS client');
    console.log('📋 Using Supabase Dashboard SQL Editor is required\n');
    console.log('   Quick steps:');
    console.log('   1. Open: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log(`   2. Copy SQL from: ${MIGRATION_FILE}`);
    console.log('   3. Paste and run\n');
    
    // But let's try one more thing: use the Supabase REST API with exec
    const execUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec`;
    
    try {
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ 
          query: migrationSQL 
        })
      });

      if (response.ok) {
        console.log('✅ Migration applied via exec function!\n');
        return true;
      }
    } catch (e) {
      // exec function doesn't exist
    }

    return false;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Try using psql if available
async function tryPsql() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if psql is available
    await execAsync('which psql');
    
    // Build connection string from SERVICE_ROLE_KEY
    // The SERVICE_ROLE_KEY is a JWT, we need the actual DB password
    // For Supabase, we can construct the connection string differently
    
    console.log('📝 psql found, but database password needed from SERVICE_ROLE_KEY\n');
    console.log('💡 For security, please apply migration via Dashboard\n');
    return false;
  } catch {
    return false;
  }
}

applyMigration().then(async (success) => {
  if (!success) {
    // Try psql as fallback
    await tryPsql();
  }
  
  // Final verification
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('product_images')
    .select('id')
    .limit(1);

  if (!error) {
    console.log('✅ Verification: Table exists!\n');
    console.log('🎉 Migration successful!\n');
    process.exit(0);
  } else {
    console.log('❌ Verification: Table does not exist yet\n');
    console.log('📋 Please apply manually via Supabase Dashboard SQL Editor\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

