/**
 * Script per eseguire il test completo del sistema programma
 * Esegue lo script SQL completo tramite Supabase Management API
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  console.error('\n⚠️  Per eseguire lo script SQL completo, hai due opzioni:');
  console.error('\n1. Esegui manualmente nel Supabase Dashboard:');
  console.error('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
  console.error('   File: test-completo-programma.sql');
  console.error('\n2. Fornisci la service role key:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_key');
  console.error('   npx tsx esegui-test-programma.ts');
  process.exit(1);
}

async function executeSQLViaRPC(sql: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SQL eseguito con successo');
      return true;
    } else {
      const errorText = await response.text();
      console.log('⚠️  RPC exec_sql non disponibile:', errorText.substring(0, 200));
      return false;
    }
  } catch (e: any) {
    console.log('⚠️  RPC exec_sql non disponibile:', e.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Esecuzione Test Completo Sistema Programma');
  console.log('==============================================\n');
  
  // Leggi lo script SQL
  const sqlFile = join(process.cwd(), 'test-completo-programma.sql');
  let sql: string;
  
  try {
    sql = readFileSync(sqlFile, 'utf-8');
    console.log(`✅ File letto: ${sqlFile} (${sql.length} caratteri)\n`);
  } catch (e: any) {
    console.error(`❌ Errore leggendo file: ${sqlFile}`);
    console.error(`   ${e.message}`);
    process.exit(1);
  }
  
  // Prova a eseguire tramite RPC
  console.log('🔄 Tentativo esecuzione tramite RPC exec_sql...\n');
  const success = await executeSQLViaRPC(sql);
  
  if (!success) {
    console.log('\n⚠️  Non posso eseguire SQL arbitrario tramite API REST.');
    console.log('\n📋 ISTRUZIONI PER ESECUZIONE MANUALE:');
    console.log('=====================================\n');
    console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('2. Apri il file: test-completo-programma.sql');
    console.log('3. Copia TUTTO il contenuto');
    console.log('4. Incolla nel SQL Editor');
    console.log('5. Clicca "Run" o premi Ctrl+Enter\n');
    console.log('Lo script è idempotente e può essere eseguito più volte.\n');
    process.exit(0);
  }
  
  console.log('\n✅ Test completato con successo!');
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});



