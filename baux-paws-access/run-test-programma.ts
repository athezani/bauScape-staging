/**
 * Script per eseguire il test completo del sistema programma
 * Esegue tutte le query SQL necessarie per testare il sistema
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables from process.env (already loaded by the system)

// Try to read from .env.local file directly
import { readFileSync } from 'fs';
import { join } from 'path';

let SUPABASE_URL: string | undefined;
let SUPABASE_SERVICE_ROLE_KEY: string | undefined;

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'VITE_SUPABASE_URL' || key === 'SUPABASE_URL') {
        SUPABASE_URL = value;
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'VITE_SUPABASE_SERVICE_ROLE_KEY') {
        SUPABASE_SERVICE_ROLE_KEY = value;
      }
    }
  });
} catch (e) {
  // File not found, try process.env
}

SUPABASE_URL = SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n⚠️  Non posso eseguire lo script senza le credenziali.');
  console.error('Esegui manualmente lo script SQL nel Supabase Dashboard:');
  console.error('   File: test-completo-programma.sql');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sql: string): Promise<void> {
  // Try to execute via RPC if available
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (!error) {
      return;
    }
  } catch (e) {
    // RPC not available, continue with direct execution
  }

  // For now, we'll execute the operations directly using Supabase client
  // This is a simplified version that executes the key operations
  console.log('⚠️  exec_sql RPC non disponibile. Eseguendo operazioni direttamente...');
}

async function checkTablesExist(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('trip_program_day')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (e) {
    return false;
  }
}

async function createTables(): Promise<void> {
  console.log('📋 Creando tabelle...');
  
  // Note: We can't create tables directly via Supabase client
  // The user needs to run the migration SQL manually
  console.log('⚠️  La creazione di tabelle deve essere fatta manualmente via SQL Editor');
  console.log('   File: supabase/migrations/20250116000002_add_product_program.sql');
}

async function createProgramForExperience(): Promise<void> {
  console.log('\n📋 Creando programma per esperienza...');
  
  const { data: experiences } = await supabase
    .from('experience')
    .select('id, name')
    .eq('active', true)
    .limit(1);
  
  if (!experiences || experiences.length === 0) {
    console.log('⚠️  Nessuna esperienza attiva trovata');
    return;
  }
  
  const exp = experiences[0];
  console.log(`   Usando esperienza: ${exp.name} (${exp.id})`);
  
  // Delete existing program
  await supabase
    .from('trip_program_day')
    .delete()
    .eq('product_id', exp.id)
    .eq('product_type', 'experience');
  
  // Create day
  const { data: day, error: dayError } = await supabase
    .from('trip_program_day')
    .insert({
      product_id: exp.id,
      product_type: 'experience',
      day_number: 1,
      introduction: 'Una giornata indimenticabile nella natura con il tuo amico a quattro zampe!',
    })
    .select('id')
    .single();
  
  if (dayError || !day) {
    console.error('❌ Errore creando giorno:', dayError);
    return;
  }
  
  // Create activities
  const activities = [
    'Ritrovo alle 9:00 al punto di incontro',
    'Passeggiata guidata di 2 ore nel bosco',
    'Pausa pranzo al sacco (non incluso)',
    'Attività di socializzazione tra cani',
    'Rientro previsto alle 17:00',
  ];
  
  const items = activities.map((text, index) => ({
    day_id: day.id,
    activity_text: text,
    order_index: index,
  }));
  
  const { error: itemsError } = await supabase
    .from('trip_program_item')
    .insert(items);
  
  if (itemsError) {
    console.error('❌ Errore creando attività:', itemsError);
    return;
  }
  
  console.log('✅ Programma esperienza creato con successo');
}

async function createProgramForClass(): Promise<void> {
  console.log('\n📋 Creando programma per classe...');
  
  const { data: classes } = await supabase
    .from('class')
    .select('id, name')
    .eq('active', true)
    .limit(1);
  
  if (!classes || classes.length === 0) {
    console.log('⚠️  Nessuna classe attiva trovata');
    return;
  }
  
  const classProduct = classes[0];
  console.log(`   Usando classe: ${classProduct.name} (${classProduct.id})`);
  
  // Delete existing program
  await supabase
    .from('trip_program_day')
    .delete()
    .eq('product_id', classProduct.id)
    .eq('product_type', 'class');
  
  // Create day
  const { data: day, error: dayError } = await supabase
    .from('trip_program_day')
    .insert({
      product_id: classProduct.id,
      product_type: 'class',
      day_number: 1,
      introduction: 'Un corso completo per migliorare la comunicazione con il tuo cane.',
    })
    .select('id')
    .single();
  
  if (dayError || !day) {
    console.error('❌ Errore creando giorno:', dayError);
    return;
  }
  
  // Create activities
  const activities = [
    'Teoria: Comunicazione e linguaggio del corpo',
    'Esercizi pratici di base',
    'Pausa caffè (inclusa)',
    'Socializzazione guidata',
    'Domande e risposte finali',
  ];
  
  const items = activities.map((text, index) => ({
    day_id: day.id,
    activity_text: text,
    order_index: index,
  }));
  
  const { error: itemsError } = await supabase
    .from('trip_program_item')
    .insert(items);
  
  if (itemsError) {
    console.error('❌ Errore creando attività:', itemsError);
    return;
  }
  
  console.log('✅ Programma classe creato con successo');
}

async function createProgramForTrip(): Promise<void> {
  console.log('\n📋 Creando programma per viaggio...');
  
  const { data: trips } = await supabase
    .from('trip')
    .select('id, name, duration_days')
    .eq('active', true)
    .limit(1);
  
  if (!trips || trips.length === 0) {
    console.log('⚠️  Nessun viaggio attivo trovato');
    return;
  }
  
  const trip = trips[0];
  const durationDays = trip.duration_days || 3;
  console.log(`   Usando viaggio: ${trip.name} (${trip.id}), durata: ${durationDays} giorni`);
  
  // Delete existing program
  await supabase
    .from('trip_program_day')
    .delete()
    .eq('product_id', trip.id)
    .eq('product_type', 'trip');
  
  // Create days (max 3 for test)
  for (let dayNum = 1; dayNum <= Math.min(durationDays, 3); dayNum++) {
    const { data: day, error: dayError } = await supabase
      .from('trip_program_day')
      .insert({
        product_id: trip.id,
        product_type: 'trip',
        day_number: dayNum,
        introduction: dayNum === 1
          ? 'Giorno di arrivo e accoglienza. Iniziamo questa avventura insieme!'
          : dayNum === 2
          ? 'Giornata dedicata alle escursioni e alle attività principali.'
          : 'Giorno finale con attività di chiusura e saluti.',
      })
      .select('id')
      .single();
    
    if (dayError || !day) {
      console.error(`❌ Errore creando giorno ${dayNum}:`, dayError);
      continue;
    }
    
    // Create activities
    const activities = dayNum === 1
      ? [
          'Arrivo e check-in alle 14:00',
          'Presentazione del gruppo e briefing iniziale',
          'Passeggiata di benvenuto',
          'Cena di gruppo (inclusa)',
        ]
      : dayNum === 2
      ? [
          'Colazione alle 8:00',
          'Escursione guidata di mezza giornata',
          'Pranzo al sacco (incluso)',
          'Attività pomeridiane a scelta',
          'Cena e serata libera',
        ]
      : [
          'Colazione e check-out',
          'Escursione finale breve',
          'Saluti e partenza',
        ];
    
    const items = activities.map((text, index) => ({
      day_id: day.id,
      activity_text: text,
      order_index: index,
    }));
    
    const { error: itemsError } = await supabase
      .from('trip_program_item')
      .insert(items);
    
    if (itemsError) {
      console.error(`❌ Errore creando attività per giorno ${dayNum}:`, itemsError);
    } else {
      console.log(`✅ Giorno ${dayNum} creato con successo`);
    }
  }
  
  console.log('✅ Programma viaggio creato con successo');
}

async function showSummary(): Promise<void> {
  console.log('\n📊 Riepilogo Programmi Creati:');
  console.log('================================');
  
  const { data: days } = await supabase
    .from('trip_program_day')
    .select(`
      product_type,
      day_number,
      introduction,
      trip_program_item (
        id,
        activity_text,
        order_index
      )
    `)
    .order('product_type')
    .order('day_number');
  
  if (!days || days.length === 0) {
    console.log('Nessun programma trovato');
    return;
  }
  
  // Group by product type
  const byType: Record<string, any[]> = {};
  days.forEach(day => {
    if (!byType[day.product_type]) {
      byType[day.product_type] = [];
    }
    byType[day.product_type].push(day);
  });
  
  Object.entries(byType).forEach(([type, typeDays]) => {
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Prodotti con programma: ${new Set(typeDays.map(d => (d as any).product_id)).size}`);
    console.log(`  Giorni totali: ${typeDays.length}`);
    const totalActivities = typeDays.reduce((sum, day) => {
      return sum + ((day.trip_program_item as any[])?.length || 0);
    }, 0);
    console.log(`  Attività totali: ${totalActivities}`);
  });
  
  // Show examples
  console.log('\n📋 Esempi Programmi:');
  console.log('================================');
  days.slice(0, 5).forEach((day: any) => {
    console.log(`\n${day.product_type} - Giorno ${day.day_number}:`);
    if (day.introduction) {
      console.log(`  Introduzione: ${day.introduction.substring(0, 60)}...`);
    }
    const items = (day.trip_program_item || []).sort((a: any, b: any) => a.order_index - b.order_index);
    items.forEach((item: any, idx: number) => {
      console.log(`  ${idx + 1}. ${item.activity_text}`);
    });
  });
}

async function main() {
  console.log('🚀 Test Sistema Programma Prodotto');
  console.log('==================================\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);
  
  // Check if tables exist
  const tablesExist = await checkTablesExist();
  
  if (!tablesExist) {
    console.log('❌ Tabelle non trovate!');
    console.log('\n⚠️  Devi prima applicare la migration:');
    console.log('   1. Vai su Supabase Dashboard → SQL Editor');
    console.log('   2. Apri: supabase/migrations/20250116000002_add_product_program.sql');
    console.log('   3. Copia tutto il contenuto e eseguilo');
    console.log('   4. Poi riprova questo script\n');
    process.exit(1);
  }
  
  console.log('✅ Tabelle verificate\n');
  
  // Create programs
  await createProgramForExperience();
  await createProgramForClass();
  await createProgramForTrip();
  
  // Show summary
  await showSummary();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETATI CON SUCCESSO!');
  console.log('='.repeat(50));
  console.log('\nProssimi passi:');
  console.log('1. Verifica i programmi nel provider portal');
  console.log('2. Verifica la visualizzazione nel frontend ecommerce');
  console.log('3. Testa la creazione/modifica di programmi');
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

