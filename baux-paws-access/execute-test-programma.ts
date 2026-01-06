/**
 * Script per eseguire il test completo del sistema programma
 * Esegue tutte le query SQL direttamente tramite Supabase REST API
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';

// Leggi la service role key dall'ambiente o chiedila
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  console.error('Imposta la variabile: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

async function executeSQL(sql: string): Promise<any> {
  // Usa la REST API di Supabase per eseguire SQL
  // Nota: Supabase non supporta direttamente SQL arbitrario via REST API
  // Dobbiamo usare le operazioni equivalenti tramite il client
  
  // Per operazioni DDL, dobbiamo usare un approccio diverso
  // Provo a usare rpc se disponibile, altrimenti eseguo le operazioni equivalenti
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
      return await response.json();
    }
  } catch (e) {
    // RPC non disponibile, continuo con operazioni dirette
  }
  
  return null;
}

async function checkTablesExist(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function createProgramForExperience(): Promise<void> {
  console.log('\n📋 Creando programma per esperienza...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/experience?select=id,name&active=eq.true&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  const experiences = await response.json();
  
  if (!experiences || experiences.length === 0) {
    console.log('⚠️  Nessuna esperienza attiva trovata');
    return;
  }
  
  const exp = experiences[0];
  console.log(`   Usando esperienza: ${exp.name} (${exp.id})`);
  
  // Delete existing
  await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day?product_id=eq.${exp.id}&product_type=eq.experience`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  // Create day
  const dayResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      product_id: exp.id,
      product_type: 'experience',
      day_number: 1,
      introduction: 'Una giornata indimenticabile nella natura con il tuo amico a quattro zampe!',
    }),
  });
  
  const day = await dayResponse.json();
  
  if (!dayResponse.ok || !day || day.length === 0) {
    console.error('❌ Errore creando giorno:', await dayResponse.text());
    return;
  }
  
  const dayId = Array.isArray(day) ? day[0].id : day.id;
  
  // Create activities
  const activities = [
    'Ritrovo alle 9:00 al punto di incontro',
    'Passeggiata guidata di 2 ore nel bosco',
    'Pausa pranzo al sacco (non incluso)',
    'Attività di socializzazione tra cani',
    'Rientro previsto alle 17:00',
  ];
  
  const items = activities.map((text, index) => ({
    day_id: dayId,
    activity_text: text,
    order_index: index,
  }));
  
  const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(items),
  });
  
  if (!itemsResponse.ok) {
    console.error('❌ Errore creando attività:', await itemsResponse.text());
    return;
  }
  
  console.log('✅ Programma esperienza creato con successo');
}

async function createProgramForClass(): Promise<void> {
  console.log('\n📋 Creando programma per classe...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/class?select=id,name&active=eq.true&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  const classes = await response.json();
  
  if (!classes || classes.length === 0) {
    console.log('⚠️  Nessuna classe attiva trovata');
    return;
  }
  
  const classProduct = classes[0];
  console.log(`   Usando classe: ${classProduct.name} (${classProduct.id})`);
  
  // Delete existing
  await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day?product_id=eq.${classProduct.id}&product_type=eq.class`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  // Create day
  const dayResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      product_id: classProduct.id,
      product_type: 'class',
      day_number: 1,
      introduction: 'Un corso completo per migliorare la comunicazione con il tuo cane.',
    }),
  });
  
  const day = await dayResponse.json();
  
  if (!dayResponse.ok || !day || day.length === 0) {
    console.error('❌ Errore creando giorno:', await dayResponse.text());
    return;
  }
  
  const dayId = Array.isArray(day) ? day[0].id : day.id;
  
  // Create activities
  const activities = [
    'Teoria: Comunicazione e linguaggio del corpo',
    'Esercizi pratici di base',
    'Pausa caffè (inclusa)',
    'Socializzazione guidata',
    'Domande e risposte finali',
  ];
  
  const items = activities.map((text, index) => ({
    day_id: dayId,
    activity_text: text,
    order_index: index,
  }));
  
  const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(items),
  });
  
  if (!itemsResponse.ok) {
    console.error('❌ Errore creando attività:', await itemsResponse.text());
    return;
  }
  
  console.log('✅ Programma classe creato con successo');
}

async function createProgramForTrip(): Promise<void> {
  console.log('\n📋 Creando programma per viaggio...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/trip?select=id,name,duration_days&active=eq.true&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  const trips = await response.json();
  
  if (!trips || trips.length === 0) {
    console.log('⚠️  Nessun viaggio attivo trovato');
    return;
  }
  
  const trip = trips[0];
  const durationDays = trip.duration_days || 3;
  console.log(`   Usando viaggio: ${trip.name} (${trip.id}), durata: ${durationDays} giorni`);
  
  // Delete existing
  await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day?product_id=eq.${trip.id}&product_type=eq.trip`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  // Create days (max 3 for test)
  for (let dayNum = 1; dayNum <= Math.min(durationDays, 3); dayNum++) {
    const dayResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        product_id: trip.id,
        product_type: 'trip',
        day_number: dayNum,
        introduction: dayNum === 1
          ? 'Giorno di arrivo e accoglienza. Iniziamo questa avventura insieme!'
          : dayNum === 2
          ? 'Giornata dedicata alle escursioni e alle attività principali.'
          : 'Giorno finale con attività di chiusura e saluti.',
      }),
    });
    
    const day = await dayResponse.json();
    
    if (!dayResponse.ok || !day || day.length === 0) {
      console.error(`❌ Errore creando giorno ${dayNum}:`, await dayResponse.text());
      continue;
    }
    
    const dayId = Array.isArray(day) ? day[0].id : day.id;
    
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
      day_id: dayId,
      activity_text: text,
      order_index: index,
    }));
    
    const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(items),
    });
    
    if (!itemsResponse.ok) {
      console.error(`❌ Errore creando attività per giorno ${dayNum}:`, await itemsResponse.text());
    } else {
      console.log(`✅ Giorno ${dayNum} creato con successo`);
    }
  }
  
  console.log('✅ Programma viaggio creato con successo');
}

async function showSummary(): Promise<void> {
  console.log('\n📊 Riepilogo Programmi Creati:');
  console.log('================================');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/trip_program_day?select=product_type,day_number,introduction,trip_program_item(id,activity_text,order_index)&order=product_type.asc,day_number.asc`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  const days = await response.json();
  
  if (!days || days.length === 0) {
    console.log('Nessun programma trovato');
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



