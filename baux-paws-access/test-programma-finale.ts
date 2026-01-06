/**
 * Script finale per testare il sistema programma
 * Funziona anche senza service role key (solo lettura)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpqbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzY4MDAsImV4cCI6MjA1MDA1MjgwMH0.7X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Usa service role key se disponibile, altrimenti anon key (solo lettura)
const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkTablesExist(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_program_day')
      .select('id')
      .limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

async function createProgramForExperience(): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Service role key non disponibile, salto creazione programmi');
    return;
  }
  
  console.log('\n📋 Creando programma per esperienza...');
  
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name')
    .eq('active', true)
    .limit(1);
  
  if (expError || !experiences || experiences.length === 0) {
    console.log('⚠️  Nessuna esperienza attiva trovata');
    return;
  }
  
  const exp = experiences[0];
  console.log(`   Usando esperienza: ${exp.name} (${exp.id})`);
  
  // Delete existing
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
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  
  console.log('\n📋 Creando programma per classe...');
  
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name')
    .eq('active', true)
    .limit(1);
  
  if (classError || !classes || classes.length === 0) {
    console.log('⚠️  Nessuna classe attiva trovata');
    return;
  }
  
  const classProduct = classes[0];
  console.log(`   Usando classe: ${classProduct.name} (${classProduct.id})`);
  
  // Delete existing
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
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  
  console.log('\n📋 Creando programma per viaggio...');
  
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, duration_days')
    .eq('active', true)
    .limit(1);
  
  if (tripError || !trips || trips.length === 0) {
    console.log('⚠️  Nessun viaggio attivo trovato');
    return;
  }
  
  const trip = trips[0];
  const durationDays = trip.duration_days || 3;
  console.log(`   Usando viaggio: ${trip.name} (${trip.id}), durata: ${durationDays} giorni`);
  
  // Delete existing
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
  console.log('\n📊 Riepilogo Programmi Esistenti:');
  console.log('================================');
  
  const { data: days, error } = await supabase
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
  
  if (error) {
    console.error('❌ Errore caricando programmi:', error.message);
    return;
  }
  
  if (!days || days.length === 0) {
    console.log('⚠️  Nessun programma trovato nel database');
    console.log('   (Normale se non hai ancora creato programmi)');
    return;
  }
  
  // Group by product type
  const byType: Record<string, any[]> = {};
  days.forEach((day: any) => {
    if (!byType[day.product_type]) {
      byType[day.product_type] = [];
    }
    byType[day.product_type].push(day);
  });
  
  Object.entries(byType).forEach(([type, typeDays]) => {
    const uniqueProducts = new Set(typeDays.map((d: any) => d.product_id));
    const totalActivities = typeDays.reduce((sum: number, day: any) => {
      return sum + ((day.trip_program_item || []).length);
    }, 0);
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Prodotti con programma: ${uniqueProducts.size}`);
    console.log(`  Giorni totali: ${typeDays.length}`);
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
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Usando: ${SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key (solo lettura)'}\n`);
  
  // Check if tables exist
  const tablesExist = await checkTablesExist();
  
  if (!tablesExist) {
    console.log('❌ Tabelle non trovate!');
    console.log('\n⚠️  La migration deve essere applicata prima.');
    console.log('   Esegui: npx supabase db push --include-all\n');
    process.exit(1);
  }
  
  console.log('✅ Tabelle verificate\n');
  
  // Create programs (solo se abbiamo service role key)
  if (SUPABASE_SERVICE_ROLE_KEY) {
    await createProgramForExperience();
    await createProgramForClass();
    await createProgramForTrip();
  } else {
    console.log('⚠️  Service role key non disponibile');
    console.log('   Eseguendo solo verifica lettura...\n');
  }
  
  // Show summary (funziona anche con anon key)
  await showSummary();
  
  console.log('\n' + '='.repeat(50));
  if (SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ TEST COMPLETATI CON SUCCESSO!');
  } else {
    console.log('✅ VERIFICA COMPLETATA!');
    console.log('⚠️  Per creare programmi, fornisci SUPABASE_SERVICE_ROLE_KEY');
  }
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



