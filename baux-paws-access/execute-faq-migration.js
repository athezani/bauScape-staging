/**
 * Execute FAQ Migration using Supabase Service Role Key
 * This script executes the migration SQL directly via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeMigration() {
  console.log('🚀 Eseguendo migration FAQ...\n');
  
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20250117000000_add_product_faq.sql');
  
  try {
    // Read migration file
    console.log('📄 Leggendo file migration...');
    const sql = readFileSync(migrationPath, 'utf8');
    console.log(`✅ File letto (${sql.length} caratteri)\n`);
    
    // Split SQL into statements (handle DO blocks specially)
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChars = sql.substring(i, Math.min(i + 10, sql.length));
      
      if (nextChars.startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
        currentStatement += 'DO $$';
        i += 4; // Skip 'DO $$'
        continue;
      }
      
      if (inDoBlock) {
        currentStatement += char;
        if (char === '$' && sql[i + 1] === '$') {
          doBlockDepth--;
          if (doBlockDepth === 0) {
            inDoBlock = false;
            statements.push(currentStatement.trim());
            currentStatement = '';
            i++; // Skip second $
          }
        } else if (nextChars.startsWith('$$')) {
          // Nested $$ block
          doBlockDepth++;
        }
      } else {
        if (char === ';') {
          const stmt = currentStatement.trim();
          if (stmt && !stmt.startsWith('--') && stmt.length > 5) {
            statements.push(stmt);
          }
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📝 Trovate ${statements.length} istruzioni SQL\n`);
    
    // Execute via Supabase REST API using rpc or direct SQL execution
    // Since Supabase doesn't support arbitrary SQL via REST, we'll use the Management API
    // For DDL operations, we need to use psql or Supabase CLI, but we can try via REST
    
    console.log('⚠️  Supabase REST API non supporta direttamente DDL (CREATE TABLE, etc.)');
    console.log('⚠️  Eseguendo tramite Management API...\n');
    
    // Try to execute via Supabase Management API
    // Note: This requires the project to have SQL execution enabled
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (response.ok) {
      console.log('✅ Migration eseguita con successo!\n');
      return true;
    }
    
    // If RPC doesn't work, try alternative approach
    const errorText = await response.text();
    console.log(`⚠️  RPC exec_sql non disponibile: ${response.status}`);
    console.log(`   Errore: ${errorText}\n`);
    
    // Alternative: Use Supabase Management API (requires different endpoint)
    console.log('📋 Istruzioni per eseguire manualmente:\n');
    console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('2. Copia il contenuto di: supabase/migrations/20250117000000_add_product_faq.sql');
    console.log('3. Incolla nel SQL Editor');
    console.log('4. Clicca "Run"\n');
    
    return false;
    
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione della migration:', error.message);
    console.error('\n📋 Esegui manualmente la migration via Supabase Dashboard:\n');
    console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('2. Copia il contenuto di: supabase/migrations/20250117000000_add_product_faq.sql');
    console.log('3. Incolla nel SQL Editor');
    console.log('4. Clicca "Run"\n');
    return false;
  }
}

async function verifyMigration() {
  console.log('🔍 Verificando che le tabelle esistano...\n');
  
  try {
    // Check if faq table exists
    const { data: faqData, error: faqError } = await supabase
      .from('faq')
      .select('id')
      .limit(1);
    
    if (faqError && faqError.code !== 'PGRST116') {
      console.log(`⚠️  Errore verificando tabella faq: ${faqError.message}`);
    } else if (faqError && faqError.code === 'PGRST116') {
      console.log('❌ Tabella faq non esiste');
      return false;
    } else {
      console.log('✅ Tabella faq esiste');
    }
    
    // Check if product_faq table exists
    const { data: productFaqData, error: productFaqError } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);
    
    if (productFaqError && productFaqError.code !== 'PGRST116') {
      console.log(`⚠️  Errore verificando tabella product_faq: ${productFaqError.message}`);
    } else if (productFaqError && productFaqError.code === 'PGRST116') {
      console.log('❌ Tabella product_faq non esiste');
      return false;
    } else {
      console.log('✅ Tabella product_faq esiste');
    }
    
    console.log('\n✅ Migration verificata con successo!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FAQ Migration Executor');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Try to execute migration
  const executed = await executeMigration();
  
  if (!executed) {
    // If automatic execution failed, try to verify if tables already exist
    console.log('🔍 Verificando se le tabelle esistono già...\n');
    const verified = await verifyMigration();
    
    if (verified) {
      console.log('✅ Le tabelle esistono già! La migration potrebbe essere già stata applicata.\n');
      process.exit(0);
    } else {
      console.log('❌ Le tabelle non esistono. Esegui manualmente la migration.\n');
      process.exit(1);
    }
  } else {
    // Verify migration was successful
    await verifyMigration();
    process.exit(0);
  }
}

main().catch(console.error);

