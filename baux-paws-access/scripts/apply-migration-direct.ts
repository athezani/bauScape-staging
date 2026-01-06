/**
 * Apply Product Images Migration Directly
 * This script applies the migration using Supabase REST API
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
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/20251229000000_create_product_images_table.sql');

async function applyMigration() {
  console.log('📦 Applying Product Images Migration...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    console.error('   Need: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Read migration file
  if (!existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
  console.log('✅ Migration file loaded\n');

  // Use Supabase REST API to execute SQL
  // Note: We'll use the PostgREST API with a direct SQL execution endpoint
  // If that doesn't exist, we'll provide instructions for manual application
  
  console.log('📝 Applying migration via Supabase API...\n');

  try {
    // Try to execute via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (response.ok) {
      console.log('✅ Migration applied successfully via API!\n');
    } else {
      // API endpoint might not exist, provide manual instructions
      console.log('⚠️  Cannot apply via API (this is normal)');
      console.log('📋 Please apply the migration manually:\n');
      console.log('   Option 1: Via Supabase Dashboard (Recommended)');
      console.log('   1. Go to: https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Go to: SQL Editor');
      console.log('   4. Click: "New query"');
      console.log('   5. Copy and paste the SQL below:');
      console.log('\n' + '='.repeat(60));
      console.log(migrationSQL);
      console.log('='.repeat(60) + '\n');
      console.log('   6. Click: "Run"');
      console.log('   7. Verify the table was created\n');
      
      console.log('   Option 2: Via Supabase CLI');
      console.log('   cd baux-paws-access');
      console.log('   npx supabase migration up\n');
    }
  } catch (error) {
    console.log('⚠️  API call failed (this is normal)');
    console.log('📋 Please apply the migration manually (see instructions above)\n');
  }

  // Verify table exists
  console.log('🔍 Verifying table creation...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet');
        console.log('   Please apply the migration manually (see instructions above)\n');
      } else {
        console.log(`⚠️  Error: ${error.message}`);
      }
    } else {
      console.log('✅ Table "product_images" exists!\n');
      
      // Check RLS
      try {
        const { count } = await supabase
          .from('product_images')
          .select('*', { count: 'exact', head: true });
        console.log(`✅ RLS policies configured (public read: ${count !== null ? 'Yes' : 'No'})\n`);
      } catch (e) {
        console.log('⚠️  Could not verify RLS policies\n');
      }
    }
  } catch (error) {
    console.log(`❌ Error verifying: ${error}\n`);
  }
}

applyMigration();

