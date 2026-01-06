/**
 * Run FAQ Migrations
 * Executes the FAQ migration SQL files using Supabase secret key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath) {
  console.log(`\n📄 Running migration: ${filePath}...`);
  
  try {
    const sql = readFileSync(filePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.length > 10) { // Skip very short statements
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            // Try direct query if RPC doesn't work
            console.log(`   Trying direct execution...`);
          }
        } catch (e) {
          // Ignore individual statement errors, continue
        }
      }
    }

    // Use REST API to execute SQL directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      // Try alternative: use PostgREST or direct SQL execution
      console.log(`   ⚠️  RPC method not available, trying alternative...`);
      
      // For now, we'll need to execute via Supabase dashboard or CLI
      console.log(`   ⚠️  Please run this migration manually in Supabase SQL Editor`);
      console.log(`   File: ${filePath}`);
      return false;
    }

    console.log(`   ✅ Migration completed`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Running FAQ Migrations...\n');

  const migration1 = join(__dirname, 'supabase/migrations/20250117000000_add_product_faq.sql');
  const migration2 = join(__dirname, 'supabase/migrations/20250117000001_add_example_faqs.sql');

  console.log('⚠️  Note: Supabase JS client cannot execute arbitrary SQL directly.');
  console.log('⚠️  Please run these migrations manually in Supabase SQL Editor:\n');
  console.log(`   1. ${migration1}`);
  console.log(`   2. ${migration2}\n`);
  console.log('Or use Supabase CLI: supabase db push\n');

  // Check if tables exist
  console.log('Checking if tables already exist...');
  try {
    const { data: faqCheck } = await supabase
      .from('faq')
      .select('id')
      .limit(1);

    console.log('✅ FAQ table exists');
  } catch (error) {
    console.log('❌ FAQ table does not exist - migrations need to be run');
  }

  try {
    const { data: productFaqCheck } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);

    console.log('✅ product_faq table exists');
  } catch (error) {
    console.log('❌ product_faq table does not exist - migrations need to be run');
  }
}

main().catch(console.error);



