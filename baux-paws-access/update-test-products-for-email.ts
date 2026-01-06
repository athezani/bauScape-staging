/**
 * Script per aggiornare i prodotti di test con tutti i nuovi campi
 * per testare l'email di conferma prenotazione
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestProductData {
  name: string;
  description: string;
  included_items: string[];
  excluded_items: string[];
  meeting_info: {
    text: string;
    google_maps_link: string;
  };
  show_meeting_info: boolean;
  cancellation_policy: string;
  program?: {
    days: Array<{
      day_number: number;
      introduction?: string | null;
      items: Array<{
        activity_text: string;
        order_index: number;
      }>;
    }>;
  };
}

const testProductsData: Record<'class' | 'experience' | 'trip', TestProductData> = {
  class: {
    name: 'TEST EMAIL - Classe di Addestramento',
    description: 'Classe di addestramento completa per cani di tutte le età. Imparerai le tecniche base e avanzate per educare il tuo amico a quattro zampe. Un corso intensivo di 2 ore con istruttore certificato.',
    included_items: [
      'Attestato di partecipazione',
      'Materiale didattico completo',
      'Coffee break',
      'Supporto post-corso via email',
      'Accesso a video tutorial esclusivi'
    ],
    excluded_items: [
      'Trasporto da/per punto di incontro',
      'Pranzo',
      'Assicurazione personale',
      'Attrezzatura personale (guinzaglio, collare)'
    ],
    meeting_info: {
      text: 'Ritrovo alle 9:00 presso il parcheggio del Parco Centrale, ingresso principale. In caso di pioggia ci sposteremo nella struttura coperta adiacente. Si prega di arrivare 10 minuti prima per il check-in.',
      google_maps_link: 'https://maps.google.com/?q=Parco+Centrale+Milano'
    },
    show_meeting_info: true,
    cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata. Tra 7 e 3 giorni prima: rimborso del 50%. Meno di 3 giorni prima: nessun rimborso. In caso di maltempo estremo, la classe sarà riprogrammata senza costi aggiuntivi.',
    program: {
      days: [
        {
          day_number: 1,
          introduction: 'Programma completo della classe di addestramento di 2 ore.',
          items: [
            { activity_text: 'Accoglienza e presentazione (15 min)', order_index: 1 },
            { activity_text: 'Teoria base: comunicazione con il cane (30 min)', order_index: 2 },
            { activity_text: 'Esercizi pratici: comandi base (45 min)', order_index: 3 },
            { activity_text: 'Coffee break (15 min)', order_index: 4 },
            { activity_text: 'Esercizi avanzati e risoluzione problemi (30 min)', order_index: 5 },
            { activity_text: 'Q&A e consegna attestato (15 min)', order_index: 6 }
          ]
        }
      ]
    }
  },
  experience: {
    name: 'TEST EMAIL - Escursione Montagna con Cane',
    description: 'Escursione guidata in montagna alla scoperta di sentieri panoramici adatti ai cani. Un\'esperienza indimenticabile per te e il tuo amico a quattro zampe. Durata 4 ore con guida esperta.',
    included_items: [
      'Guida esperta certificata',
      'Attrezzatura base (zaino, kit primo soccorso)',
      'Merenda per te e il tuo cane',
      'Foto ricordo dell\'escursione',
      'Assicurazione base per l\'attività'
    ],
    excluded_items: [
      'Trasporto da/per punto di incontro',
      'Pranzo al sacco',
      'Assicurazione personale extra',
      'Attrezzatura tecnica personale (scarpe, abbigliamento)',
      'Bevande extra'
    ],
    meeting_info: {
      text: 'Ritrovo alle 8:30 presso il parcheggio del Rifugio Monte Bianco. Partenza alle 9:00 in punto. Si consiglia di arrivare con almeno 15 minuti di anticipo per preparare l\'attrezzatura. In caso di condizioni meteo avverse, l\'escursione sarà annullata con rimborso completo.',
      google_maps_link: 'https://maps.google.com/?q=Rifugio+Monte+Bianco'
    },
    show_meeting_info: true,
    cancellation_policy: 'Cancellazione gratuita fino a 3 giorni prima della data prenotata. Tra 3 giorni e 24 ore prima: rimborso del 50%. Meno di 24 ore prima: nessun rimborso. In caso di condizioni meteo pericolose, l\'escursione sarà annullata con rimborso completo entro 48 ore.',
    program: {
      days: [
        {
          day_number: 1,
          introduction: 'Programma completo dell\'escursione di 4 ore in montagna.',
          items: [
            { activity_text: 'Ritrovo e briefing iniziale (30 min)', order_index: 1 },
            { activity_text: 'Partenza e salita al primo punto panoramico (1h 30min)', order_index: 2 },
            { activity_text: 'Sosta panoramica e merenda (30 min)', order_index: 3 },
            { activity_text: 'Continuazione escursione verso la vetta (1h)', order_index: 4 },
            { activity_text: 'Arrivo alla vetta e foto ricordo (30 min)', order_index: 5 },
            { activity_text: 'Discesa e ritorno al punto di partenza (1h)', order_index: 6 },
            { activity_text: 'Conclusione e saluti (10 min)', order_index: 7 }
          ]
        }
      ]
    }
  },
  trip: {
    name: 'TEST EMAIL - Viaggio nelle Dolomiti',
    description: 'Viaggio di 3 giorni nelle Dolomiti con il tuo cane. Pernottamenti in rifugio, escursioni guidate e momenti di relax in uno dei paesaggi più belli d\'Italia.',
    included_items: [
      'Pernottamento in rifugio (2 notti)',
      'Colazione e cena incluse',
      'Guida alpina certificata',
      'Trasporto tra i rifugi',
      'Kit benvenuto per il cane',
      'Assicurazione base per l\'attività'
    ],
    excluded_items: [
      'Trasporto da/per punto di partenza',
      'Pranzo al sacco',
      'Bevande extra (acqua disponibile)',
      'Assicurazione viaggio personale',
      'Attrezzatura tecnica personale',
      'Spese personali'
    ],
    meeting_info: {
      text: 'Ritrovo alle 7:00 presso la stazione di partenza (Piazzale Stazione Dolomiti). Partenza alle 7:30 con bus navetta per il primo rifugio. Si prega di arrivare con almeno 20 minuti di anticipo per il check-in e la sistemazione dei bagagli. In caso di ritardo, contattare immediatamente il numero di emergenza.',
      google_maps_link: 'https://maps.google.com/?q=Stazione+Dolomiti'
    },
    show_meeting_info: true,
    cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima della data di partenza. Tra 14 e 7 giorni prima: rimborso del 50%. Tra 7 e 3 giorni prima: rimborso del 25%. Meno di 3 giorni prima: nessun rimborso. In caso di condizioni meteo estreme che impediscano il viaggio, rimborso completo entro 48 ore.',
    program: {
      days: [
        {
          day_number: 1,
          introduction: 'Arrivo e sistemazione al rifugio. Breve escursione di acclimatamento con vista panoramica.',
          items: [
            { activity_text: 'Check-in al rifugio e sistemazione', order_index: 1 },
            { activity_text: 'Pranzo al sacco (portare da casa)', order_index: 2 },
            { activity_text: 'Escursione di acclimatamento (2 ore, difficoltà facile)', order_index: 3 },
            { activity_text: 'Ritorno al rifugio e relax', order_index: 4 },
            { activity_text: 'Cena in rifugio (inclusa)', order_index: 5 }
          ]
        },
        {
          day_number: 2,
          introduction: 'Giornata principale con escursione più impegnativa e pranzo in quota.',
          items: [
            { activity_text: 'Colazione in rifugio (inclusa)', order_index: 1 },
            { activity_text: 'Escursione principale (5-6 ore, difficoltà media)', order_index: 2 },
            { activity_text: 'Pranzo al sacco in quota con vista panoramica', order_index: 3 },
            { activity_text: 'Ritorno al rifugio nel pomeriggio', order_index: 4 },
            { activity_text: 'Tempo libero e relax', order_index: 5 },
            { activity_text: 'Cena in rifugio (inclusa)', order_index: 6 }
          ]
        },
        {
          day_number: 3,
          introduction: 'Ultima escursione mattutina e partenza nel pomeriggio.',
          items: [
            { activity_text: 'Colazione in rifugio (inclusa)', order_index: 1 },
            { activity_text: 'Escursione finale (3 ore, difficoltà facile)', order_index: 2 },
            { activity_text: 'Ritorno al rifugio e check-out', order_index: 3 },
            { activity_text: 'Pranzo al sacco (portare da casa)', order_index: 4 },
            { activity_text: 'Partenza con bus navetta (14:00)', order_index: 5 }
          ]
        }
      ]
    }
  }
};

async function findOrCreateTestProduct(type: 'class' | 'experience' | 'trip'): Promise<string | null> {
  console.log(`\n🔍 Cercando prodotto di test per ${type}...`);
  
  const tableName = type;
  const testName = `TEST EMAIL`;
  
  // Cerca prodotto esistente con "TEST EMAIL" nel nome
  const { data: existingProducts, error: searchError } = await supabase
    .from(tableName)
    .select('id, name, provider_id')
    .ilike('name', `%${testName}%`)
    .limit(1);
  
  if (searchError) {
    console.log(`   ⚠️  Errore nella ricerca: ${searchError.message}`);
  }
  
  if (existingProducts && existingProducts.length > 0) {
    const product = existingProducts[0];
    console.log(`   ✅ Prodotto trovato: ${product.id} - ${product.name}`);
    return product.id;
  }
  
  // Se non esiste, crea un nuovo prodotto
  console.log(`   📦 Creando nuovo prodotto di test...`);
  
  // Trova un provider
  const { data: providers, error: providerError } = await supabase
    .from('profile')
    .select('id')
    .eq('active', true)
    .limit(1);
  
  if (providerError || !providers || providers.length === 0) {
    console.log(`   ❌ Nessun provider trovato`);
    return null;
  }
  
  const providerId = providers[0].id;
  const data = testProductsData[type];
  
  // Calcola i costi del provider (circa il 60% del prezzo finale)
  const priceAdultBase = type === 'trip' ? 300 : type === 'experience' ? 80 : 50;
  const priceDogBase = type === 'trip' ? 150 : type === 'experience' ? 40 : 25;
  const providerCostAdultBase = Math.round(priceAdultBase * 0.6 * 100) / 100;
  const providerCostDogBase = Math.round(priceDogBase * 0.6 * 100) / 100;
  
  const baseData: any = {
    provider_id: providerId,
    name: data.name,
    description: data.description,
    max_adults: type === 'trip' ? 10 : 8,
    max_dogs: type === 'trip' ? 5 : 4,
    pricing_type: 'linear',
    price_adult_base: priceAdultBase,
    price_dog_base: priceDogBase,
    // Pricing model fields
    pricing_model: 'percentage',
    margin_percentage: 66.67, // Per ottenere il prezzo finale: cost * 1.6667 ≈ cost * 1.67
    provider_cost_adult_base: providerCostAdultBase,
    provider_cost_dog_base: providerCostDogBase,
    images: [],
    highlights: type === 'class' 
      ? ['Corso intensivo', 'Materiale incluso', 'Istruttore certificato', 'Attestato finale']
      : type === 'experience'
      ? ['Escursione guidata', 'Vista panoramica', 'Foto incluse', 'Guida esperta']
      : ['Pernottamento in rifugio', 'Colazione inclusa', 'Guida alpina', 'Vista mozzafiato'],
    included_items: data.included_items,
    excluded_items: data.excluded_items,
    meeting_info: data.meeting_info,
    show_meeting_info: data.show_meeting_info,
    cancellation_policy: data.cancellation_policy,
    attributes: [],
    active: true, // ATTIVO per il testing
  };
  
  // Aggiungi campi specifici per tipo
  if (type === 'class' || type === 'experience') {
    baseData.duration_hours = type === 'class' ? 2 : 4;
    baseData.meeting_point = 'Punto di incontro test';
    baseData.no_adults = false;
  } else if (type === 'trip') {
    baseData.duration_days = 3;
    baseData.location = 'Dolomiti';
    const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    baseData.start_date = startDate.toISOString().split('T')[0];
    baseData.end_date = endDate.toISOString().split('T')[0];
  }
  
  const { data: newProduct, error: createError } = await supabase
    .from(tableName)
    .insert(baseData)
    .select('id')
    .single();
  
  if (createError || !newProduct) {
    console.log(`   ❌ Errore nella creazione: ${createError?.message}`);
    return null;
  }
  
  console.log(`   ✅ Prodotto creato: ${newProduct.id}`);
  return newProduct.id;
}

async function updateTestProduct(type: 'class' | 'experience' | 'trip', productId: string): Promise<boolean> {
  console.log(`\n📝 Aggiornando prodotto ${productId} (${type})...`);
  
  const tableName = type;
  const data = testProductsData[type];
  
  // Calcola i costi del provider (circa il 60% del prezzo finale)
  const priceAdultBase = type === 'trip' ? 300 : type === 'experience' ? 80 : 50;
  const priceDogBase = type === 'trip' ? 150 : type === 'experience' ? 40 : 25;
  const providerCostAdultBase = Math.round(priceAdultBase * 0.6 * 100) / 100;
  const providerCostDogBase = Math.round(priceDogBase * 0.6 * 100) / 100;
  
  const updateData: any = {
    name: data.name,
    description: data.description,
    included_items: data.included_items,
    excluded_items: data.excluded_items,
    meeting_info: data.meeting_info,
    show_meeting_info: data.show_meeting_info,
    cancellation_policy: data.cancellation_policy,
    highlights: type === 'class' 
      ? ['Corso intensivo', 'Materiale incluso', 'Istruttore certificato', 'Attestato finale']
      : type === 'experience'
      ? ['Escursione guidata', 'Vista panoramica', 'Foto incluse', 'Guida esperta']
      : ['Pernottamento in rifugio', 'Colazione inclusa', 'Guida alpina', 'Vista mozzafiato'],
    // Pricing model fields
    pricing_model: 'percentage',
    margin_percentage: 66.67, // Per ottenere il prezzo finale: cost * 1.6667 ≈ cost * 1.67
    provider_cost_adult_base: providerCostAdultBase,
    provider_cost_dog_base: providerCostDogBase,
    active: true, // Assicurati che sia attivo
  };
  
  const { error: updateError } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', productId);
  
  if (updateError) {
    console.log(`   ❌ Errore nell'aggiornamento: ${updateError.message}`);
    return false;
  }
  
  console.log(`   ✅ Prodotto aggiornato con successo`);
  console.log(`   - Included items: ${data.included_items.length} elementi`);
  console.log(`   - Excluded items: ${data.excluded_items.length} elementi`);
  console.log(`   - Meeting info: ${data.show_meeting_info ? 'VISIBILE' : 'Nascosto'}`);
  console.log(`   - Cancellation policy: ${data.cancellation_policy.substring(0, 50)}...`);
  
  return true;
}

async function createOrUpdateProgram(productId: string, productType: 'class' | 'experience' | 'trip'): Promise<boolean> {
  console.log(`\n📅 Creando/aggiornando programma per ${productType} ${productId}...`);
  
  const program = testProductsData[productType].program;
  if (!program) {
    console.log(`   ⚠️  Nessun programma definito per ${productType}`);
    return false;
  }
  
  // Elimina programma esistente
  await supabase
    .from('trip_program_day')
    .delete()
    .eq('product_id', productId)
    .eq('product_type', productType);
  
  // Crea nuovo programma
  for (const day of program.days) {
    // Crea il giorno
    const { data: dayData, error: dayError } = await supabase
      .from('trip_program_day')
      .insert({
        product_id: productId,
        product_type: productType,
        day_number: day.day_number,
        introduction: day.introduction || null,
      })
      .select('id')
      .single();
    
    if (dayError || !dayData) {
      console.log(`   ❌ Errore creazione giorno ${day.day_number}: ${dayError?.message}`);
      continue;
    }
    
    // Crea gli item del giorno
    if (day.items && day.items.length > 0) {
      const items = day.items.map(item => ({
        day_id: dayData.id,
        activity_text: item.activity_text,
        order_index: item.order_index,
      }));
      
      const { error: itemsError } = await supabase
        .from('trip_program_item')
        .insert(items);
      
      if (itemsError) {
        console.log(`   ❌ Errore creazione item per giorno ${day.day_number}: ${itemsError.message}`);
        continue;
      }
    }
    
    console.log(`   ✅ Giorno ${day.day_number} creato con ${day.items?.length || 0} attività`);
  }
  
  console.log(`   ✅ Programma completo creato con ${program.days.length} giorni`);
  return true;
}

async function main() {
  console.log('🚀 AGGIORNAMENTO PRODOTTI DI TEST PER EMAIL');
  console.log('='.repeat(70));
  console.log('Questo script aggiorna i prodotti di test con tutti i nuovi campi');
  console.log('necessari per testare l\'email di conferma prenotazione');
  console.log('='.repeat(70));
  
  const results: { type: string; success: boolean; productId?: string }[] = [];
  
  // Processa ogni tipo di prodotto
  for (const type of ['class', 'experience', 'trip'] as const) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PROCESSANDO ${type.toUpperCase()}`);
    console.log('='.repeat(70));
    
    // Trova o crea prodotto
    const productId = await findOrCreateTestProduct(type);
    
    if (!productId) {
      console.log(`   ❌ Impossibile trovare o creare prodotto per ${type}`);
      results.push({ type, success: false });
      continue;
    }
    
    // Aggiorna prodotto
    const updateSuccess = await updateTestProduct(type, productId);
    
    if (!updateSuccess) {
      console.log(`   ❌ Impossibile aggiornare prodotto per ${type}`);
      results.push({ type, success: false, productId });
      continue;
    }
    
    // Crea/aggiorna programma per tutti i tipi
    await createOrUpdateProgram(productId, type);
    
    results.push({ type, success: true, productId });
    console.log(`   ✅ ${type} completato: ${productId}`);
  }
  
  // Riepilogo
  console.log(`\n${'='.repeat(70)}`);
  console.log('RIEPILOGO');
  console.log('='.repeat(70));
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.type}: ${result.productId}`);
    } else {
      console.log(`❌ ${result.type}: FALLITO`);
    }
  });
  
  const allSuccess = results.every(r => r.success);
  const successCount = results.filter(r => r.success).length;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Risultato: ${successCount}/${results.length} prodotti aggiornati`);
  console.log(`${allSuccess ? '✅ TUTTI I PRODOTTI AGGIORNATI!' : '⚠️  ALCUNI PRODOTTI NON AGGIORNATI'}`);
  console.log('='.repeat(70));
  
  if (allSuccess) {
    console.log('\n📧 I prodotti sono pronti per testare l\'email di conferma!');
    console.log('   Puoi procedere con una prenotazione di test per verificare');
    console.log('   che tutti i campi appaiano correttamente nell\'email.');
  }
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

