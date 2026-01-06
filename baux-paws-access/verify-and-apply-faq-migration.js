/**
 * Verify and provide instructions for FAQ migration
 * Since Supabase doesn't support DDL via REST API, this script verifies
 * if tables exist and provides clear instructions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkTablesExist() {
  console.log('🔍 Verificando se le tabelle FAQ esistono...\n');
  
  let faqExists = false;
  let productFaqExists = false;
  
  // Check faq table
  try {
    const { data, error } = await supabase
      .from('faq')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        faqExists = false;
      } else {
        console.log(`⚠️  Errore verificando faq: ${error.message}`);
      }
    } else {
      faqExists = true;
    }
  } catch (error) {
    faqExists = false;
  }
  
  // Check product_faq table
  try {
    const { data, error } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        productFaqExists = false;
      } else {
        console.log(`⚠️  Errore verificando product_faq: ${error.message}`);
      }
    } else {
      productFaqExists = true;
    }
  } catch (error) {
    productFaqExists = false;
  }
  
  return { faqExists, productFaqExists };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FAQ Migration - Verifica e Istruzioni');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const { faqExists, productFaqExists } = await checkTablesExist();
  
  if (faqExists && productFaqExists) {
    console.log('✅ Le tabelle FAQ esistono già!');
    console.log('   - faq: ✅');
    console.log('   - product_faq: ✅\n');
    console.log('✅ La migration è già stata applicata.\n');
    return;
  }
  
  console.log('❌ Le tabelle FAQ non esistono ancora.\n');
  console.log(`   - faq: ${faqExists ? '✅' : '❌'}`);
  console.log(`   - product_faq: ${productFaqExists ? '✅' : '❌'}\n`);
  
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20250117000000_add_product_faq.sql');
  
  try {
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('📋 ISTRUZIONI PER APPLICARE LA MIGRATION:\n');
    console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('2. Copia il contenuto del file:');
    console.log(`   ${migrationPath}`);
    console.log('3. Incolla nel SQL Editor di Supabase');
    console.log('4. Clicca "Run" o premi Ctrl+Enter (Cmd+Enter su Mac)');
    console.log('5. Attendi che la migration sia completata\n');
    
    console.log('📄 Contenuto della migration (prime 10 righe):\n');
    const lines = sql.split('\n').slice(0, 10);
    lines.forEach((line, i) => {
      console.log(`   ${i + 1}: ${line}`);
    });
    console.log('   ...\n');
    
    console.log('✅ Dopo aver applicato la migration, esegui di nuovo questo script per verificare.\n');
    
  } catch (error) {
    console.error('❌ Errore leggendo il file migration:', error.message);
    console.log('\n📋 File migration: supabase/migrations/20250117000000_add_product_faq.sql\n');
  }
}

main().catch(console.error);

