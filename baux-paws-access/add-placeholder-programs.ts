/**
 * Script per aggiungere programmi placeholder a tutti i prodotti attivi
 */

import { createClient } from '@supabase/supabase-js';
import type { ProductProgram, ProgramDay } from './src/types/product.types';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function loadProductProgram(
  productId: string,
  productType: 'class' | 'experience' | 'trip'
): Promise<ProductProgram | null> {
  const { data: days, error } = await supabase
    .from('trip_program_day')
    .select(`
      id,
      day_number,
      introduction,
      trip_program_item (
        id,
        activity_text,
        order_index
      )
    `)
    .eq('product_id', productId)
    .eq('product_type', productType)
    .order('day_number', { ascending: true });

  if (error || !days || days.length === 0) {
    return null;
  }

  const programDays: ProgramDay[] = days.map(day => ({
    id: day.id,
    day_number: day.day_number,
    introduction: day.introduction || null,
    items: (day.trip_program_item as any[] || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(item => ({
        id: item.id,
        activity_text: item.activity_text,
        order_index: item.order_index,
      })),
  }));

  return { days: programDays };
}

async function saveProductProgram(
  productId: string,
  productType: 'class' | 'experience' | 'trip',
  program: ProductProgram | null
): Promise<void> {
  // Delete existing program
  await supabase
    .from('trip_program_day')
    .delete()
    .eq('product_id', productId)
    .eq('product_type', productType);

  if (!program || !program.days || program.days.length === 0) {
    return;
  }

  // Insert days and items
  for (const day of program.days) {
    const { data: insertedDay, error: dayError } = await supabase
      .from('trip_program_day')
      .insert({
        product_id: productId,
        product_type: productType,
        day_number: day.day_number,
        introduction: day.introduction || null,
      })
      .select('id')
      .single();

    if (dayError) {
      throw new Error(`Errore inserimento giorno: ${dayError.message}`);
    }

    if (day.items && day.items.length > 0) {
      const itemsToInsert = day.items.map((item, index) => ({
        day_id: insertedDay.id,
        activity_text: item.activity_text.trim(),
        order_index: item.order_index !== undefined ? item.order_index : index,
      }));

      const { error: itemsError } = await supabase
        .from('trip_program_item')
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(`Errore inserimento attività: ${itemsError.message}`);
      }
    }
  }
}

function generatePlaceholderProgram(
  productType: 'class' | 'experience' | 'trip',
  durationDays?: number
): ProductProgram {
  if (productType === 'class') {
    return {
      days: [{
        day_number: 1,
        introduction: 'Un corso completo per migliorare la comunicazione e il rapporto con il tuo cane attraverso tecniche pratiche e teoriche.',
        items: [
          { activity_text: 'Accoglienza e presentazione del corso', order_index: 0 },
          { activity_text: 'Teoria: Comunicazione e linguaggio del corpo canino', order_index: 1 },
          { activity_text: 'Esercizi pratici guidati con il proprio cane', order_index: 2 },
          { activity_text: 'Pausa e momento di socializzazione', order_index: 3 },
          { activity_text: 'Sessione di domande e risposte', order_index: 4 },
          { activity_text: 'Consegna materiale didattico e saluti finali', order_index: 5 },
        ],
      }],
    };
  }

  if (productType === 'experience') {
    return {
      days: [{
        day_number: 1,
        introduction: 'Una giornata indimenticabile nella natura con il tuo amico a quattro zampe, tra passeggiate, attività e momenti di relax.',
        items: [
          { activity_text: 'Ritrovo al punto di incontro e presentazione del gruppo', order_index: 0 },
          { activity_text: 'Passeggiata guidata di circa 2-3 ore nel percorso naturalistico', order_index: 1 },
          { activity_text: 'Pausa pranzo al sacco in un punto panoramico (pranzo non incluso)', order_index: 2 },
          { activity_text: 'Attività di socializzazione e gioco tra i cani partecipanti', order_index: 3 },
          { activity_text: 'Breve sessione fotografica con i propri cani', order_index: 4 },
          { activity_text: 'Rientro al punto di partenza e saluti finali', order_index: 5 },
        ],
      }],
    };
  }

  // Trip
  const days: ProgramDay[] = [];
  const maxDays = Math.min(durationDays || 3, 5); // Max 5 giorni per placeholder

  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    let introduction = '';
    let activities: string[] = [];

    if (dayNum === 1) {
      introduction = 'Giorno di arrivo e accoglienza. Iniziamo questa avventura insieme con il benvenuto e la sistemazione.';
      activities = [
        'Arrivo e check-in presso la struttura (orario indicato nella conferma)',
        'Presentazione del gruppo e briefing iniziale sulle attività previste',
        'Passeggiata di benvenuto per conoscere l\'area circostante',
        'Cena di gruppo per socializzare (inclusa nel pacchetto)',
        'Serata libera e relax',
      ];
    } else if (dayNum === maxDays) {
      introduction = 'Giorno finale con attività di chiusura e saluti. Un ultimo momento insieme prima del rientro.';
      activities = [
        'Colazione e preparazione al check-out',
        'Escursione finale breve o attività mattutina',
        'Momento di condivisione e feedback sull\'esperienza',
        'Saluti e partenza (orario indicato nella conferma)',
      ];
    } else {
      introduction = `Giornata dedicata alle escursioni e alle attività principali del viaggio. Un giorno ricco di avventure e scoperte.`;
      activities = [
        'Colazione presso la struttura (inclusa)',
        'Escursione guidata di mezza giornata nel territorio circostante',
        'Pranzo al sacco o presso struttura convenzionata (incluso)',
        'Attività pomeridiane a scelta tra le opzioni disponibili',
        'Rientro alla struttura e tempo libero',
        'Cena e serata libera',
      ];
    }

    days.push({
      day_number: dayNum,
      introduction,
      items: activities.map((text, index) => ({
        activity_text: text,
        order_index: index,
      })),
    });
  }

  return { days };
}

async function addPlaceholderPrograms() {
  console.log('🚀 Aggiunta Programmi Placeholder');
  console.log('==================================\n');

  const stats = {
    experiences: { total: 0, added: 0, skipped: 0 },
    classes: { total: 0, added: 0, skipped: 0 },
    trips: { total: 0, added: 0, skipped: 0 },
  };

  // Process Experiences
  console.log('📋 Processando Esperienze...');
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name')
    .eq('active', true);

  if (expError) {
    console.error('❌ Errore caricamento esperienze:', expError.message);
  } else if (experiences) {
    stats.experiences.total = experiences.length;
    for (const exp of experiences) {
      try {
        const existing = await loadProductProgram(exp.id, 'experience');
        if (existing && existing.days.length > 0) {
          console.log(`   ⏭️  ${exp.name}: programma già esistente`);
          stats.experiences.skipped++;
        } else {
          const program = generatePlaceholderProgram('experience');
          await saveProductProgram(exp.id, 'experience', program);
          console.log(`   ✅ ${exp.name}: programma placeholder aggiunto`);
          stats.experiences.added++;
        }
      } catch (e: any) {
        console.error(`   ❌ ${exp.name}: errore - ${e.message}`);
      }
    }
  }

  // Process Classes
  console.log('\n📋 Processando Classi...');
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name')
    .eq('active', true);

  if (classError) {
    console.error('❌ Errore caricamento classi:', classError.message);
  } else if (classes) {
    stats.classes.total = classes.length;
    for (const cls of classes) {
      try {
        const existing = await loadProductProgram(cls.id, 'class');
        if (existing && existing.days.length > 0) {
          console.log(`   ⏭️  ${cls.name}: programma già esistente`);
          stats.classes.skipped++;
        } else {
          const program = generatePlaceholderProgram('class');
          await saveProductProgram(cls.id, 'class', program);
          console.log(`   ✅ ${cls.name}: programma placeholder aggiunto`);
          stats.classes.added++;
        }
      } catch (e: any) {
        console.error(`   ❌ ${cls.name}: errore - ${e.message}`);
      }
    }
  }

  // Process Trips
  console.log('\n📋 Processando Viaggi...');
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, duration_days')
    .eq('active', true);

  if (tripError) {
    console.error('❌ Errore caricamento viaggi:', tripError.message);
  } else if (trips) {
    stats.trips.total = trips.length;
    for (const trip of trips) {
      try {
        const existing = await loadProductProgram(trip.id, 'trip');
        if (existing && existing.days.length > 0) {
          console.log(`   ⏭️  ${trip.name}: programma già esistente`);
          stats.trips.skipped++;
        } else {
          const program = generatePlaceholderProgram('trip', trip.duration_days || 3);
          await saveProductProgram(trip.id, 'trip', program);
          console.log(`   ✅ ${trip.name}: programma placeholder aggiunto (${program.days.length} giorni)`);
          stats.trips.added++;
        }
      } catch (e: any) {
        console.error(`   ❌ ${trip.name}: errore - ${e.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RIEPILOGO');
  console.log('='.repeat(50));
  console.log(`\nEsperienze:`);
  console.log(`  Totali: ${stats.experiences.total}`);
  console.log(`  Aggiunti: ${stats.experiences.added}`);
  console.log(`  Saltati (già esistenti): ${stats.experiences.skipped}`);
  console.log(`\nClassi:`);
  console.log(`  Totali: ${stats.classes.total}`);
  console.log(`  Aggiunti: ${stats.classes.added}`);
  console.log(`  Saltati (già esistenti): ${stats.classes.skipped}`);
  console.log(`\nViaggi:`);
  console.log(`  Totali: ${stats.trips.total}`);
  console.log(`  Aggiunti: ${stats.trips.added}`);
  console.log(`  Saltati (già esistenti): ${stats.trips.skipped}`);
  
  const totalAdded = stats.experiences.added + stats.classes.added + stats.trips.added;
  const totalSkipped = stats.experiences.skipped + stats.classes.skipped + stats.trips.skipped;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Totale programmi aggiunti: ${totalAdded}`);
  console.log(`⏭️  Totale programmi saltati: ${totalSkipped}`);
  console.log('='.repeat(50));
}

addPlaceholderPrograms().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});



