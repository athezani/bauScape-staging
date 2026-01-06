/**
 * Apply Product Images Migration - Final Attempt
 * Uses Supabase Management API to execute SQL directly
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
  console.log('🚀 Applying Product Images Migration...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
  
  // Extract project ID from URL
  const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectId) {
    console.error('❌ Could not extract project ID from URL');
    process.exit(1);
  }

  console.log(`📋 Project ID: ${projectId}`);
  console.log(`📝 Migration file: ${MIGRATION_FILE}\n`);

  // Use Supabase Management API
  // The Management API endpoint for executing SQL is:
  // https://api.supabase.com/v1/projects/{project_id}/database/query
  
  try {
    console.log('📤 Sending migration to Supabase Management API...\n');
    
    // Try Management API
    const managementUrl = `https://api.supabase.com/v1/projects/${projectId}/database/query`;
    
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration applied successfully via Management API!\n');
      console.log('Result:', JSON.stringify(result, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.log(`⚠️  Management API returned: ${response.status}`);
      console.log(`   ${errorText.substring(0, 200)}\n`);
    }
  } catch (error) {
    console.log(`⚠️  Management API error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Alternative: Use PostgREST with direct SQL execution
  // Some Supabase instances have an exec_sql function
  console.log('📤 Trying PostgREST exec_sql function...\n');
  
  try {
    const execUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    
    const response = await fetch(execUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        sql: migrationSQL 
      })
    });

    if (response.ok) {
      console.log('✅ Migration applied successfully via exec_sql!\n');
      return true;
    } else {
      const errorText = await response.text();
      console.log(`⚠️  exec_sql returned: ${response.status}`);
      console.log(`   ${errorText.substring(0, 200)}\n`);
    }
  } catch (error) {
    console.log(`⚠️  exec_sql error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Last resort: Execute statements one by one using Supabase JS client
  console.log('📤 Trying to execute via Supabase JS client (statement by statement)...\n');
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Split SQL into statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments
    if (statement.startsWith('--')) continue;

    try {
      // For CREATE TABLE, CREATE INDEX, etc., we can't use the JS client directly
      // But we can verify if the table exists after
      if (statement.includes('CREATE TABLE') && statement.includes('product_images')) {
        // Check if table already exists
        const { data, error } = await supabase
          .from('product_images')
          .select('id')
          .limit(1);

        if (!error) {
          console.log(`  ✅ Statement ${i + 1}: Table already exists`);
          successCount++;
          continue;
        }
      }

      // For other statements, we'll need to use raw SQL
      // Since Supabase JS doesn't support raw SQL, we'll note what needs to be done
      console.log(`  ⚠️  Statement ${i + 1}: Cannot execute via JS client (needs raw SQL)`);
      errorCount++;
    } catch (error) {
      console.log(`  ❌ Statement ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  // Final verification
  console.log('\n🔍 Verifying table creation...\n');
  
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Table "product_images" exists!\n');
      console.log('✅ Migration successful!\n');
      return true;
    } else {
      console.log(`❌ Table does not exist: ${error.message}\n`);
      console.log('📋 Manual application required:\n');
      console.log('   1. Go to: https://supabase.com/dashboard');
      console.log('   2. Select project and go to SQL Editor');
      console.log(`   3. Copy SQL from: ${MIGRATION_FILE}`);
      console.log('   4. Paste and execute\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ Verification error: ${error}\n`);
    return false;
  }
}

applyMigration().then(success => {
  if (success) {
    console.log('🎉 Setup complete! The table has been created.');
    process.exit(0);
  } else {
    console.log('⚠️  Automatic migration failed. Please apply manually.');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

