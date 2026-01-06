/**
 * Script per applicare le migration degli attributi prodotti
 * Esegue prima la migration che aggiunge la colonna, poi quella che assegna gli attributi
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Errore: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati');
  console.error('   Usa: export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeMigration(filename: string): Promise<void> {
  const migrationPath = join(__dirname, 'supabase', 'migrations', filename);
  console.log(`\n📄 Leggendo migration: ${filename}`);
  
  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ File letto (${sql.length} caratteri)`);
    
    console.log(`\n🚀 Eseguendo migration...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Se la funzione exec_sql non esiste, proviamo con una query diretta
      console.log('⚠️  exec_sql non disponibile, provo metodo alternativo...');
      
      // Dividiamo il SQL in singole istruzioni se necessario
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
          if (stmtError) {
            console.error(`❌ Errore nell'esecuzione:`, stmtError);
            throw stmtError;
          }
        }
      }
    }
    
    console.log(`✅ Migration ${filename} eseguita con successo!`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`❌ File non trovato: ${migrationPath}`);
    } else if (error.message?.includes('exec_sql')) {
      console.log('\n⚠️  La funzione exec_sql non è disponibile.');
      console.log('📝 Esegui manualmente la migration via Supabase Dashboard:');
      console.log(`   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new`);
      console.log(`   File: ${migrationPath}`);
    } else {
      console.error(`❌ Errore:`, error);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Applicazione migration attributi prodotti...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  
  try {
    // Prima eseguiamo la migration che aggiunge la colonna (se non esiste già)
    console.log('\n📋 Step 1: Verifica colonna attributes...');
    const { data: columnCheck, error: checkError } = await supabase
      .from('experience')
      .select('attributes')
      .limit(1);
    
    if (checkError && checkError.message.includes('column') && checkError.message.includes('does not exist')) {
      console.log('⚠️  Colonna attributes non trovata, eseguo migration di creazione...');
      await executeMigration('20250116000000_add_product_attributes.sql');
    } else {
      console.log('✅ Colonna attributes già presente');
    }
    
    // Poi eseguiamo la migration che assegna gli attributi
    console.log('\n📋 Step 2: Assegnazione attributi ai prodotti...');
    await executeMigration('20250116000001_assign_product_attributes.sql');
    
    // Verifica risultati
    console.log('\n📊 Verifica risultati...');
    const [expCount, classCount, tripCount] = await Promise.all([
      supabase.from('experience').select('id', { count: 'exact', head: true }),
      supabase.from('class').select('id', { count: 'exact', head: true }),
      supabase.from('trip').select('id', { count: 'exact', head: true }),
    ]);
    
    const [expWithAttrs, classWithAttrs, tripWithAttrs] = await Promise.all([
      supabase.from('experience').select('id').not('attributes', 'is', null),
      supabase.from('class').select('id').not('attributes', 'is', null),
      supabase.from('trip').select('id').not('attributes', 'is', null),
    ]);
    
    console.log('\n✅ Riepilogo:');
    console.log(`   Experience: ${expWithAttrs.data?.length || 0}/${expCount.count || 0} con attributi`);
    console.log(`   Class: ${classWithAttrs.data?.length || 0}/${classCount.count || 0} con attributi`);
    console.log(`   Trip: ${tripWithAttrs.data?.length || 0}/${tripCount.count || 0} con attributi`);
    
    console.log('\n🎉 Migration completata con successo!');
  } catch (error: any) {
    console.error('\n❌ Errore durante l\'esecuzione:', error.message);
    console.error('\n💡 Alternativa: Esegui manualmente via Supabase Dashboard');
    console.error('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    process.exit(1);
  }
}

main();



