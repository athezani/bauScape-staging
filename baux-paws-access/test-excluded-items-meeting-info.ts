/**
 * Test End-to-End: excluded_items, meeting_info, show_meeting_info
 * Verifica che tutti i nuovi campi funzionino correttamente per tutti i tipi di prodotti
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestResult {
  success: boolean;
  message: string;
  productId?: string;
  data?: any;
  error?: string;
}

// Test data per ogni tipo di prodotto
const testData = {
  class: {
    name: 'TEST - Classe con nuovi campi',
    description: 'Test completo per verificare excluded_items, meeting_info e show_meeting_info',
    max_adults: 5,
    max_dogs: 3,
    pricing_type: 'linear' as const,
    price_adult_base: 50,
    price_dog_base: 25,
    duration_hours: 2,
    meeting_point: 'Parco Centrale',
    no_adults: false,
    images: ['https://example.com/image1.jpg'],
    highlights: ['Corso intensivo', 'Materiale incluso'],
    included_items: ['Attestato di partecipazione', 'Materiale didattico', 'Coffee break'],
    excluded_items: ['Trasporto', 'Pranzo', 'Assicurazione'],
    cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima',
    attributes: ['park'],
    meeting_info: {
      text: 'Ritrovo alle 9:00 presso il parcheggio del Parco Centrale. In caso di pioggia ci sposteremo al coperto.',
      google_maps_link: 'https://maps.google.com/?q=Parco+Centrale'
    },
    show_meeting_info: true,
    active: false, // Non attivo per non apparire nel frontend
  },
  experience: {
    name: 'TEST - Esperienza con nuovi campi',
    description: 'Test completo per verificare excluded_items, meeting_info e show_meeting_info',
    max_adults: 8,
    max_dogs: 4,
    pricing_type: 'linear' as const,
    price_adult_base: 80,
    price_dog_base: 40,
    duration_hours: 4,
    meeting_point: 'Rifugio Monte Bianco',
    no_adults: false,
    images: ['https://example.com/image2.jpg'],
    highlights: ['Escursione guidata', 'Vista panoramica', 'Foto incluse'],
    included_items: ['Guida esperta', 'Attrezzatura base', 'Merenda'],
    excluded_items: ['Trasporto da/per punto di incontro', 'Pranzo al sacco', 'Assicurazione personale'],
    cancellation_policy: 'Cancellazione gratuita fino a 3 giorni prima',
    attributes: ['mountain', 'lake'],
    meeting_info: {
      text: 'Ritrovo alle 8:30 presso il parcheggio del Rifugio Monte Bianco. Partenza alle 9:00 in punto.',
      google_maps_link: 'https://maps.google.com/?q=Rifugio+Monte+Bianco'
    },
    show_meeting_info: true,
    active: false,
  },
  trip: {
    name: 'TEST - Viaggio con nuovi campi',
    description: 'Test completo per verificare excluded_items, meeting_info e show_meeting_info',
    max_adults: 10,
    max_dogs: 5,
    pricing_type: 'linear' as const,
    price_adult_base: 300,
    price_dog_base: 150,
    duration_days: 3,
    location: 'Dolomiti',
    start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    images: ['https://example.com/image3.jpg'],
    highlights: ['Pernottamento in rifugio', 'Colazione inclusa', 'Guida alpina'],
    included_items: ['Pernottamento', 'Colazione', 'Cena', 'Guida'],
    excluded_items: ['Trasporto da/per punto di partenza', 'Pranzo', 'Bevande extra', 'Assicurazione viaggio'],
    cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima',
    attributes: ['mountain'],
    meeting_info: {
      text: 'Ritrovo alle 7:00 presso la stazione di partenza. Partenza alle 7:30 con bus navetta.',
      google_maps_link: 'https://maps.google.com/?q=Stazione+Partenza+Dolomiti'
    },
    show_meeting_info: true,
    active: false,
  },
};

async function testCreateProduct(type: 'class' | 'experience' | 'trip'): Promise<TestResult> {
  console.log(`\n📦 TEST: Creazione ${type} con tutti i nuovi campi`);
  console.log('='.repeat(60));

  try {
    // Trova un provider
    const { data: providers, error: providerError } = await supabase
      .from('profile')
      .select('id')
      .limit(1);

    if (providerError || !providers || providers.length === 0) {
      return {
        success: false,
        message: `Nessun provider trovato: ${providerError?.message || 'No providers'}`,
      };
    }

    const providerId = providers[0].id;
    const data = testData[type];
    const tableName = type;

    // Prepara i dati per l'inserimento
    const insertData: any = {
      provider_id: providerId,
      name: data.name,
      description: data.description,
      max_adults: data.max_adults,
      max_dogs: data.max_dogs,
      pricing_type: data.pricing_type,
      price_adult_base: data.price_adult_base,
      price_dog_base: data.price_dog_base,
      images: data.images,
      highlights: data.highlights,
      included_items: data.included_items,
      excluded_items: data.excluded_items,
      cancellation_policy: data.cancellation_policy,
      attributes: data.attributes,
      meeting_info: data.meeting_info,
      show_meeting_info: data.show_meeting_info,
      active: data.active,
    };

    // Aggiungi campi specifici per tipo
    if (type === 'class' || type === 'experience') {
      insertData.duration_hours = data.duration_hours;
      insertData.meeting_point = data.meeting_point;
      insertData.no_adults = data.no_adults;
    } else if (type === 'trip') {
      insertData.duration_days = data.duration_days;
      insertData.location = data.location;
      insertData.start_date = data.start_date;
      insertData.end_date = data.end_date;
    }

    console.log(`   Creando ${type}...`);
    console.log(`   - excluded_items: ${JSON.stringify(data.excluded_items)}`);
    console.log(`   - meeting_info: ${JSON.stringify(data.meeting_info)}`);
    console.log(`   - show_meeting_info: ${data.show_meeting_info}`);

    const { data: product, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      return {
        success: false,
        message: `Errore creazione ${type}`,
        error: error.message,
      };
    }

    if (!product) {
      return {
        success: false,
        message: `Prodotto creato ma non restituito`,
      };
    }

    console.log(`   ✅ ${type} creato: ${product.id}`);

    // Verifica che i campi siano stati salvati correttamente
    const checks = {
      excluded_items: Array.isArray(product.excluded_items) && product.excluded_items.length === data.excluded_items.length,
      meeting_info: product.meeting_info && 
        typeof product.meeting_info === 'object' &&
        product.meeting_info.text === data.meeting_info.text &&
        product.meeting_info.google_maps_link === data.meeting_info.google_maps_link,
      show_meeting_info: product.show_meeting_info === data.show_meeting_info,
    };

    console.log(`   Verifica campi salvati:`);
    console.log(`   - excluded_items: ${checks.excluded_items ? '✅' : '❌'}`);
    console.log(`   - meeting_info: ${checks.meeting_info ? '✅' : '❌'}`);
    console.log(`   - show_meeting_info: ${checks.show_meeting_info ? '✅' : '❌'}`);

    const allChecksPassed = Object.values(checks).every(check => check === true);

    return {
      success: allChecksPassed,
      message: allChecksPassed ? `Tutti i campi salvati correttamente` : `Alcuni campi non salvati correttamente`,
      productId: product.id,
      data: product,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Errore durante creazione ${type}`,
      error: error.message,
    };
  }
}

async function testRetrieveProduct(type: 'class' | 'experience' | 'trip', productId: string): Promise<TestResult> {
  console.log(`\n📥 TEST: Recupero ${type} dal database`);
  console.log('='.repeat(60));

  try {
    const tableName = type;

    const { data: product, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      return {
        success: false,
        message: `Errore recupero ${type}`,
        error: error.message,
      };
    }

    if (!product) {
      return {
        success: false,
        message: `Prodotto non trovato`,
      };
    }

    console.log(`   ✅ ${type} recuperato: ${product.id}`);
    console.log(`   - excluded_items: ${JSON.stringify(product.excluded_items)}`);
    console.log(`   - meeting_info: ${JSON.stringify(product.meeting_info)}`);
    console.log(`   - show_meeting_info: ${product.show_meeting_info}`);

    // Verifica struttura dati
    const checks = {
      excluded_items_exists: product.excluded_items !== null && product.excluded_items !== undefined,
      excluded_items_is_array: Array.isArray(product.excluded_items),
      meeting_info_exists: product.meeting_info !== null && product.meeting_info !== undefined,
      meeting_info_has_text: product.meeting_info && typeof (product.meeting_info as any).text === 'string',
      meeting_info_has_link: product.meeting_info && typeof (product.meeting_info as any).google_maps_link === 'string',
      show_meeting_info_exists: product.show_meeting_info !== null && product.show_meeting_info !== undefined,
      show_meeting_info_is_boolean: typeof product.show_meeting_info === 'boolean',
    };

    console.log(`   Verifica struttura dati:`);
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });

    const allChecksPassed = Object.values(checks).every(check => check === true);

    return {
      success: allChecksPassed,
      message: allChecksPassed ? `Struttura dati corretta` : `Problemi nella struttura dati`,
      data: product,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Errore durante recupero ${type}`,
      error: error.message,
    };
  }
}

async function testProductService(type: 'class' | 'experience' | 'trip', productId: string): Promise<TestResult> {
  console.log(`\n🔧 TEST: Verifica tramite Product Service (simulazione)`);
  console.log('='.repeat(60));

  try {
    // Simula il recupero tramite product service
    // In un test reale useresti il servizio, qui verifichiamo direttamente il mapping
    const tableName = type;

    const { data: product, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return {
        success: false,
        message: `Errore recupero per mapping`,
        error: error?.message,
      };
    }

    // Simula il mapping che fa productMapper
    const mappedProduct = {
      id: product.id,
      type: type,
      title: product.name,
      excludedItems: product.excluded_items && Array.isArray(product.excluded_items) 
        ? product.excluded_items 
        : undefined,
      meetingInfo: product.meeting_info && typeof product.meeting_info === 'object' && product.meeting_info !== null
        ? {
            text: (product.meeting_info as any).text || '',
            googleMapsLink: (product.meeting_info as any).google_maps_link || '',
          }
        : undefined,
      showMeetingInfo: product.show_meeting_info === true || product.show_meeting_info === 1,
    };

    console.log(`   ✅ Mapping completato`);
    console.log(`   - excludedItems: ${JSON.stringify(mappedProduct.excludedItems)}`);
    console.log(`   - meetingInfo: ${JSON.stringify(mappedProduct.meetingInfo)}`);
    console.log(`   - showMeetingInfo: ${mappedProduct.showMeetingInfo}`);

    // Verifica mapping
    const checks = {
      excludedItems_mapped: mappedProduct.excludedItems !== undefined,
      excludedItems_correct: Array.isArray(mappedProduct.excludedItems) && mappedProduct.excludedItems.length > 0,
      meetingInfo_mapped: mappedProduct.meetingInfo !== undefined,
      meetingInfo_has_text: mappedProduct.meetingInfo && mappedProduct.meetingInfo.text.length > 0,
      meetingInfo_has_link: mappedProduct.meetingInfo && mappedProduct.meetingInfo.googleMapsLink.length > 0,
      showMeetingInfo_mapped: mappedProduct.showMeetingInfo !== undefined,
    };

    console.log(`   Verifica mapping:`);
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });

    const allChecksPassed = Object.values(checks).every(check => check === true);

    return {
      success: allChecksPassed,
      message: allChecksPassed ? `Mapping corretto` : `Problemi nel mapping`,
      data: mappedProduct,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Errore durante mapping`,
      error: error.message,
    };
  }
}

async function testEdgeCases(): Promise<TestResult> {
  console.log(`\n🔍 TEST: Edge Cases`);
  console.log('='.repeat(60));

  try {
    // Trova un provider
    const { data: providers } = await supabase
      .from('profile')
      .select('id')
      .limit(1);

    if (!providers || providers.length === 0) {
      return {
        success: false,
        message: 'Nessun provider trovato per edge cases',
      };
    }

    const providerId = providers[0].id;
    const results: string[] = [];

    // Test 1: excluded_items vuoto
    console.log(`   Test 1: excluded_items vuoto`);
    const { data: product1, error: error1 } = await supabase
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST - Edge Case 1',
        description: 'Test excluded_items vuoto',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        excluded_items: [],
        cancellation_policy: 'Test',
        active: false,
      })
      .select('id, excluded_items')
      .single();

    if (error1) {
      results.push(`❌ Test 1 fallito: ${error1.message}`);
    } else {
      results.push(`✅ Test 1 passato: excluded_items vuoto accettato`);
      await supabase.from('experience').delete().eq('id', product1.id);
    }

    // Test 2: meeting_info null
    console.log(`   Test 2: meeting_info null`);
    const { data: product2, error: error2 } = await supabase
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST - Edge Case 2',
        description: 'Test meeting_info null',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        meeting_info: null,
        show_meeting_info: false,
        cancellation_policy: 'Test',
        active: false,
      })
      .select('id, meeting_info, show_meeting_info')
      .single();

    if (error2) {
      results.push(`❌ Test 2 fallito: ${error2.message}`);
    } else {
      results.push(`✅ Test 2 passato: meeting_info null accettato`);
      await supabase.from('experience').delete().eq('id', product2.id);
    }

    // Test 3: show_meeting_info false con meeting_info valorizzato
    console.log(`   Test 3: show_meeting_info false con meeting_info valorizzato`);
    const { data: product3, error: error3 } = await supabase
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST - Edge Case 3',
        description: 'Test show_meeting_info false',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        meeting_info: {
          text: 'Test',
          google_maps_link: 'https://maps.google.com'
        },
        show_meeting_info: false,
        cancellation_policy: 'Test',
        active: false,
      })
      .select('id, meeting_info, show_meeting_info')
      .single();

    if (error3) {
      results.push(`❌ Test 3 fallito: ${error3.message}`);
    } else {
      results.push(`✅ Test 3 passato: show_meeting_info false accettato`);
      await supabase.from('experience').delete().eq('id', product3.id);
    }

    console.log(`   Risultati edge cases:`);
    results.forEach(result => console.log(`   ${result}`));

    const allPassed = results.every(r => r.startsWith('✅'));

    return {
      success: allPassed,
      message: allPassed ? 'Tutti gli edge cases passati' : 'Alcuni edge cases falliti',
      data: results,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Errore durante edge cases`,
      error: error.message,
    };
  }
}

async function cleanupTestProducts(productIds: string[]): Promise<void> {
  console.log(`\n🧹 Pulizia prodotti di test`);
  console.log('='.repeat(60));

  for (const productId of productIds) {
    // Prova a eliminare da tutte le tabelle
    for (const table of ['class', 'experience', 'trip']) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', productId);

      if (!error) {
        console.log(`   ✅ Eliminato ${productId} da ${table}`);
        break;
      }
    }
  }
}

async function main() {
  console.log('🚀 TEST END-TO-END: excluded_items, meeting_info, show_meeting_info');
  console.log('='.repeat(70));
  console.log('Verifica completa per tutti i tipi di prodotti');
  console.log('='.repeat(70));

  const productIds: string[] = [];
  const results: { type: string; success: boolean; message: string }[] = [];

  // Test per ogni tipo di prodotto
  for (const type of ['class', 'experience', 'trip'] as const) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TESTING ${type.toUpperCase()}`);
    console.log('='.repeat(70));

    // Test 1: Creazione
    const createResult = await testCreateProduct(type);
    results.push({ type: `${type} - Create`, success: createResult.success, message: createResult.message });
    
    if (!createResult.success || !createResult.productId) {
      console.log(`   ❌ Test creazione fallito per ${type}`);
      continue;
    }

    productIds.push(createResult.productId);

    // Test 2: Recupero
    const retrieveResult = await testRetrieveProduct(type, createResult.productId);
    results.push({ type: `${type} - Retrieve`, success: retrieveResult.success, message: retrieveResult.message });

    // Test 3: Product Service (mapping)
    const serviceResult = await testProductService(type, createResult.productId);
    results.push({ type: `${type} - Service`, success: serviceResult.success, message: serviceResult.message });
  }

  // Test Edge Cases
  const edgeCasesResult = await testEdgeCases();
  results.push({ type: 'Edge Cases', success: edgeCasesResult.success, message: edgeCasesResult.message });

  // Cleanup
  await cleanupTestProducts(productIds);

  // Riepilogo
  console.log(`\n${'='.repeat(70)}`);
  console.log('RIEPILOGO TEST');
  console.log('='.repeat(70));

  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.type}: ${result.message}`);
  });

  const allPassed = results.every(r => r.success);
  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Risultato finale: ${passedCount}/${totalCount} test passati`);
  console.log(`${allPassed ? '✅ TUTTI I TEST PASSATI!' : '❌ ALCUNI TEST FALLITI'}`);
  console.log('='.repeat(70));

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

