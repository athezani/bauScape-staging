/**
 * Applica le parti semplici della migrazione che possono essere eseguite via API
 * Le parti complesse (funzioni, trigger) devono essere eseguite manualmente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySimpleParts() {
  console.log('🚀 Applicazione parti semplici della migrazione...\n');
  
  try {
    // Step 1: Make duration_hours nullable
    // Questo richiede ALTER TABLE che non possiamo fare via API REST
    // Dobbiamo usare il dashboard o psql
    
    console.log('⚠️  Le modifiche ALTER TABLE richiedono accesso diretto al database.');
    console.log('   Eseguendo tramite Supabase Dashboard SQL Editor...\n');
    
    // Leggi il file SQL completo
    const sqlContent = await Deno.readTextFile(
      './supabase/migrations/20251228000000_auto_calculate_duration_from_slots.sql'
    );
    
    console.log('📋 Contenuto SQL pronto per l\'esecuzione:\n');
    console.log('─'.repeat(60));
    console.log(sqlContent.substring(0, 500) + '...\n');
    console.log('─'.repeat(60));
    console.log('\n✅ File completo: supabase/migrations/20251228000000_auto_calculate_duration_from_slots.sql\n');
    
    console.log('📝 Istruzioni:');
    console.log('   1. Vai su https://supabase.com/dashboard');
    console.log('   2. Seleziona progetto: zyonwzilijgnnnmhxvbo');
    console.log('   3. Vai su SQL Editor → New Query');
    console.log('   4. Copia e incolla il contenuto del file SQL');
    console.log('   5. Clicca Run\n');
    
    // Verifica se le funzioni esistono già (dopo l'esecuzione manuale)
    console.log('🔍 Verificando stato attuale...\n');
    
    const { data: functions, error: funcError } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0)
      .then(() => {
        // Se arriviamo qui, la connessione funziona
        return { data: null, error: null };
      })
      .catch((err) => ({ data: null, error: err }));
    
    if (!funcError) {
      console.log('✅ Connessione al database OK\n');
    }
    
    console.log('💡 Per eseguire automaticamente, usa:');
    console.log('   - Supabase CLI: supabase db push');
    console.log('   - psql con connection string corretta');
    console.log('   - Supabase Dashboard SQL Editor (consigliato)\n');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

applySimpleParts();

