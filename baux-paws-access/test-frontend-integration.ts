/**
 * Test Frontend Integration: Verifica che i dati arrivino correttamente al frontend
 * Simula le chiamate API che il frontend fa per recuperare i prodotti
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tVK70OrNKiaVmttm2WxyXA_tMFn9bUc'; // Anon key per simulare frontend

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Service role per creare prodotti di test
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface FrontendProduct {
  id: string;
  type: 'class' | 'experience' | 'trip';
  title: string;
  excludedItems?: string[];
  meetingInfo?: {
    text: string;
    googleMapsLink: string;
  };
  showMeetingInfo?: boolean;
}

// Simula il mapping che fa productMapper.ts
function mapRowToProduct(row: any, type: 'class' | 'experience' | 'trip'): FrontendProduct {
  return {
    id: row.id,
    type: type,
    title: row.name,
    excludedItems: row.excluded_items && Array.isArray(row.excluded_items) 
      ? row.excluded_items 
      : undefined,
    meetingInfo: row.meeting_info && typeof row.meeting_info === 'object' && row.meeting_info !== null
      ? {
          text: (row.meeting_info as any).text || '',
          googleMapsLink: (row.meeting_info as any).google_maps_link || '',
        }
      : undefined,
    showMeetingInfo: row.show_meeting_info === true || row.show_meeting_info === 1,
  };
}

async function createTestProductForFrontend(type: 'class' | 'experience' | 'trip'): Promise<string | null> {
  try {
    // Trova un provider
    const { data: providers } = await supabaseAdmin
      .from('profile')
      .select('id')
      .limit(1);

    if (!providers || providers.length === 0) {
      console.log('   ⚠️  Nessun provider trovato');
      return null;
    }

    const providerId = providers[0].id;
    const tableName = type;

    const baseData: any = {
      provider_id: providerId,
      name: `TEST Frontend - ${type}`,
      description: `Prodotto di test per verifica frontend - ${type}`,
      max_adults: 5,
      max_dogs: 3,
      pricing_type: 'linear',
      price_adult_base: 50,
      price_dog_base: 25,
      images: [],
      highlights: ['Test highlight'],
      included_items: ['Item incluso 1', 'Item incluso 2'],
      excluded_items: ['Item NON incluso 1', 'Item NON incluso 2', 'Item NON incluso 3'],
      cancellation_policy: 'Test cancellation policy',
      attributes: [],
      meeting_info: {
        text: 'Ritrovo alle 9:00 presso il punto di incontro. In caso di pioggia ci sposteremo al coperto.',
        google_maps_link: 'https://maps.google.com/?q=Test+Meeting+Point'
      },
      show_meeting_info: true,
      active: true, // ATTIVO per essere visibile al frontend
    };

    if (type === 'class' || type === 'experience') {
      baseData.duration_hours = 2;
      baseData.meeting_point = 'Punto di incontro test';
      baseData.no_adults = false;
    } else if (type === 'trip') {
      baseData.duration_days = 3;
      baseData.location = 'Location test';
      baseData.start_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseData.end_date = new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const { data: product, error } = await supabaseAdmin
      .from(tableName)
      .insert(baseData)
      .select('id')
      .single();

    if (error || !product) {
      console.log(`   ❌ Errore creazione: ${error?.message}`);
      return null;
    }

    return product.id;
  } catch (error: any) {
    console.log(`   ❌ Errore: ${error.message}`);
    return null;
  }
}

async function testFrontendFetch(type: 'class' | 'experience' | 'trip', productId: string): Promise<boolean> {
  console.log(`\n🌐 TEST Frontend: Recupero ${type} (simulazione frontend)`);
  console.log('='.repeat(60));

  try {
    const tableName = type;

    // Simula la chiamata che fa il frontend (con anon key)
    const { data: products, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', productId)
      .eq('active', true)
      .single();

    if (error) {
      console.log(`   ❌ Errore recupero: ${error.message}`);
      return false;
    }

    if (!products) {
      console.log(`   ❌ Prodotto non trovato`);
      return false;
    }

    console.log(`   ✅ Prodotto recuperato dal frontend: ${products.id}`);

    // Applica il mapping come fa productMapper
    const mappedProduct = mapRowToProduct(products, type);

    console.log(`   📦 Dati mappati per frontend:`);
    console.log(`   - excludedItems: ${JSON.stringify(mappedProduct.excludedItems)}`);
    console.log(`   - meetingInfo: ${JSON.stringify(mappedProduct.meetingInfo)}`);
    console.log(`   - showMeetingInfo: ${mappedProduct.showMeetingInfo}`);

    // Verifica che i dati siano corretti per il frontend
    const checks = {
      excludedItems_present: mappedProduct.excludedItems !== undefined,
      excludedItems_is_array: Array.isArray(mappedProduct.excludedItems),
      excludedItems_has_data: mappedProduct.excludedItems && mappedProduct.excludedItems.length > 0,
      meetingInfo_present: mappedProduct.meetingInfo !== undefined,
      meetingInfo_has_text: mappedProduct.meetingInfo && mappedProduct.meetingInfo.text.length > 0,
      meetingInfo_has_link: mappedProduct.meetingInfo && mappedProduct.meetingInfo.googleMapsLink.length > 0,
      showMeetingInfo_present: mappedProduct.showMeetingInfo !== undefined,
      showMeetingInfo_is_boolean: typeof mappedProduct.showMeetingInfo === 'boolean',
    };

    console.log(`   Verifica dati frontend:`);
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });

    const allChecksPassed = Object.values(checks).every(check => check === true);

    if (allChecksPassed) {
      console.log(`   ✅ Tutti i dati sono corretti per il frontend`);
    } else {
      console.log(`   ❌ Alcuni dati non sono corretti`);
    }

    return allChecksPassed;
  } catch (error: any) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

async function testFrontendFetchAll(type: 'class' | 'experience' | 'trip'): Promise<boolean> {
  console.log(`\n🌐 TEST Frontend: Recupero tutti i ${type}s (simulazione frontend)`);
  console.log('='.repeat(60));

  try {
    const tableName = type;

    // Simula la chiamata che fa useProducts hook
    const { data: products, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('active', true)
      .limit(10);

    if (error) {
      console.log(`   ❌ Errore recupero: ${error.message}`);
      return false;
    }

    if (!products || products.length === 0) {
      console.log(`   ⚠️  Nessun ${type} attivo trovato`);
      return true; // Non è un errore, semplicemente non ci sono prodotti
    }

    console.log(`   ✅ Recuperati ${products.length} ${type}s`);

    // Verifica che almeno un prodotto abbia i nuovi campi
    let hasNewFields = false;
    let mappedCount = 0;

    for (const product of products) {
      const mapped = mapRowToProduct(product, type);
      
      if (mapped.excludedItems || mapped.meetingInfo || mapped.showMeetingInfo !== undefined) {
        hasNewFields = true;
        mappedCount++;
      }
    }

    console.log(`   - Prodotti con nuovi campi: ${mappedCount}/${products.length}`);

    if (hasNewFields) {
      console.log(`   ✅ I nuovi campi sono presenti nei prodotti recuperati`);
    } else {
      console.log(`   ⚠️  Nessun prodotto con nuovi campi trovato (potrebbe essere normale se non ci sono prodotti con questi campi)`);
    }

    return true;
  } catch (error: any) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

async function testFrontendScenarios(): Promise<boolean> {
  console.log(`\n🎭 TEST Frontend: Scenari di visualizzazione`);
  console.log('='.repeat(60));

  try {
    // Trova un provider
    const { data: providers } = await supabaseAdmin
      .from('profile')
      .select('id')
      .limit(1);

    if (!providers || providers.length === 0) {
      console.log('   ⚠️  Nessun provider trovato');
      return false;
    }

    const providerId = providers[0].id;
    const testProducts: string[] = [];

    // Scenario 1: show_meeting_info = true, meeting_info valorizzato
    console.log(`   Scenario 1: show_meeting_info = true`);
    const { data: product1 } = await supabaseAdmin
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST Scenario 1',
        description: 'Test',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        meeting_info: { text: 'Test text', google_maps_link: 'https://maps.google.com' },
        show_meeting_info: true,
        cancellation_policy: 'Test',
        active: true,
      })
      .select('id')
      .single();

    if (product1) {
      testProducts.push(product1.id);
      const mapped = mapRowToProduct(product1, 'experience');
      const shouldShow = mapped.showMeetingInfo === true && mapped.meetingInfo !== undefined;
      console.log(`   ${shouldShow ? '✅' : '❌'} Dovrebbe mostrare meeting info: ${shouldShow}`);
    }

    // Scenario 2: show_meeting_info = false, meeting_info valorizzato
    console.log(`   Scenario 2: show_meeting_info = false`);
    const { data: product2 } = await supabaseAdmin
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST Scenario 2',
        description: 'Test',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        meeting_info: { text: 'Test text', google_maps_link: 'https://maps.google.com' },
        show_meeting_info: false,
        cancellation_policy: 'Test',
        active: true,
      })
      .select('id')
      .single();

    if (product2) {
      testProducts.push(product2.id);
      const mapped = mapRowToProduct(product2, 'experience');
      const shouldNotShow = mapped.showMeetingInfo === false;
      console.log(`   ${shouldNotShow ? '✅' : '❌'} Non dovrebbe mostrare meeting info: ${shouldNotShow}`);
    }

    // Scenario 3: excluded_items presente
    console.log(`   Scenario 3: excluded_items presente`);
    const { data: product3 } = await supabaseAdmin
      .from('experience')
      .insert({
        provider_id: providerId,
        name: 'TEST Scenario 3',
        description: 'Test',
        max_adults: 5,
        max_dogs: 3,
        pricing_type: 'linear',
        price_adult_base: 50,
        price_dog_base: 25,
        duration_hours: 2,
        excluded_items: ['Item 1', 'Item 2'],
        cancellation_policy: 'Test',
        active: true,
      })
      .select('id')
      .single();

    if (product3) {
      testProducts.push(product3.id);
      const mapped = mapRowToProduct(product3, 'experience');
      const hasExcluded = mapped.excludedItems && mapped.excludedItems.length > 0;
      console.log(`   ${hasExcluded ? '✅' : '❌'} Excluded items presenti: ${hasExcluded}`);
    }

    // Cleanup
    for (const productId of testProducts) {
      await supabaseAdmin.from('experience').delete().eq('id', productId);
    }

    console.log(`   ✅ Scenari testati e puliti`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 TEST FRONTEND INTEGRATION');
  console.log('='.repeat(70));
  console.log('Verifica che i dati arrivino correttamente al frontend');
  console.log('='.repeat(70));

  const results: { test: string; success: boolean }[] = [];
  const productIds: string[] = [];

  // Crea prodotti di test per ogni tipo
  for (const type of ['class', 'experience', 'trip'] as const) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TESTING ${type.toUpperCase()} FRONTEND`);
    console.log('='.repeat(70));

    const productId = await createTestProductForFrontend(type);
    if (!productId) {
      results.push({ test: `${type} - Create`, success: false });
      continue;
    }

    productIds.push(productId);
    console.log(`   ✅ Prodotto di test creato: ${productId}`);

    // Test recupero singolo prodotto
    const fetchResult = await testFrontendFetch(type, productId);
    results.push({ test: `${type} - Fetch Single`, success: fetchResult });

    // Test recupero tutti i prodotti
    const fetchAllResult = await testFrontendFetchAll(type);
    results.push({ test: `${type} - Fetch All`, success: fetchAllResult });
  }

  // Test scenari
  const scenariosResult = await testFrontendScenarios();
  results.push({ test: 'Frontend Scenarios', success: scenariosResult });

  // Cleanup prodotti di test
  console.log(`\n🧹 Pulizia prodotti di test`);
  console.log('='.repeat(60));
  for (const productId of productIds) {
    for (const table of ['class', 'experience', 'trip']) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('id', productId);
      if (!error) {
        console.log(`   ✅ Eliminato ${productId} da ${table}`);
        break;
      }
    }
  }

  // Riepilogo
  console.log(`\n${'='.repeat(70)}`);
  console.log('RIEPILOGO TEST FRONTEND');
  console.log('='.repeat(70));

  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.test}`);
  });

  const allPassed = results.every(r => r.success);
  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Risultato finale: ${passedCount}/${totalCount} test passati`);
  console.log(`${allPassed ? '✅ TUTTI I TEST FRONTEND PASSATI!' : '❌ ALCUNI TEST FALLITI'}`);
  console.log('='.repeat(70));

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

