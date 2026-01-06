/**
 * Apply Product Images Migration via Supabase REST API
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
  console.log('📦 Applying Product Images Migration via API...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    if (statement.length < 10) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      // Use Supabase Management API to execute SQL
      // Note: This requires the project API key
      const response = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ 
          query: statement + ';'
        })
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

  // Try alternative: Use PostgREST directly for table creation
  console.log('\n📝 Trying alternative method...\n');
  
  // Since direct SQL execution might not work, we'll use the Supabase JS client
  // to create the table structure step by step
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check if table exists
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Table "product_images" exists!\n');
      return;
    }
  } catch (e) {
    // Table doesn't exist, continue
  }

  console.log('⚠️  Automatic migration via API is not available');
  console.log('📋 Please apply the migration manually:\n');
  console.log('   1. Go to: https://supabase.com/dashboard');
  console.log('   2. Select project: zyonwzilijgnnnmhxvbo');
  console.log('   3. Go to: SQL Editor');
  console.log('   4. Click: "New query"');
  console.log('   5. Copy the SQL from:');
  console.log(`      ${MIGRATION_FILE}`);
  console.log('   6. Paste and click "Run"');
  console.log('   7. Verify success message\n');
}

applyMigration();

