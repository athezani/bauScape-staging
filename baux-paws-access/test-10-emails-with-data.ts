/**
 * Script per testare 10 email reali con prodotti che hanno included/excluded items
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  testNumber: number;
  success: boolean;
  includedItemsLength: number;
  excludedItemsLength: number;
  includedItemsDisplay: string;
  excludedItemsDisplay: string;
  productName: string;
  error?: string;
}

async function sendTestEmail(testNumber: number, product: any): Promise<TestResult> {
  console.log(`\n📧 TEST ${testNumber}/10`);
  console.log(`   Prodotto: ${product.name}`);
  console.log(`   Tipo: ${product.type || 'trip'}`);
  console.log(`   ID: ${product.id}`);
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : [];
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : [];
  
  console.log(`   Included items nel DB: ${includedItems.length}`);
  if (includedItems.length > 0) {
    console.log(`      ${includedItems.slice(0, 3).join(', ')}${includedItems.length > 3 ? '...' : ''}`);
  }
  console.log(`   Excluded items nel DB: ${excludedItems.length}`);
  if (excludedItems.length > 0) {
    console.log(`      ${excludedItems.slice(0, 3).join(', ')}${excludedItems.length > 3 ? '...' : ''}`);
  }
  
  // Costruisci il payload email
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-${Date.now()}-${testNumber}`,
    customerEmail: 'alessandro.dezzani@lastminute.com',
    customerName: 'Alessandro',
    customerSurname: 'Dezzani',
    productName: product.name,
    productDescription: product.description || undefined,
    productType: product.type || 'trip',
    bookingDate: '2025-12-27',
    bookingTime: '10:00 - 12:00',
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 100,
    currency: 'EUR',
    orderNumber: `TEST${testNumber}`,
    noAdults: false,
    includedItems: includedItems.length > 0 ? includedItems : undefined,
    excludedItems: excludedItems.length > 0 ? excludedItems : undefined,
    meetingInfo: product.meeting_info && typeof product.meeting_info === 'object'
      ? {
          text: product.meeting_info.text || '',
          googleMapsLink: product.meeting_info.google_maps_link || '',
        }
      : undefined,
    showMeetingInfo: product.show_meeting_info === true || product.show_meeting_info === 1,
    cancellationPolicy: product.cancellation_policy || undefined,
  };
  
  console.log(`   📤 Invio email...`);
  console.log(`   Payload includedItems:`, includedItems.length > 0 ? `${includedItems.length} items` : 'undefined');
  console.log(`   Payload excludedItems:`, excludedItems.length > 0 ? `${excludedItems.length} items` : 'undefined');
  
  try {
    // Chiama la funzione send-transactional-email
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailPayload,
    });
    
    if (error) {
      console.error(`   ❌ Errore:`, error);
      return {
        testNumber,
        success: false,
        includedItemsLength: 0,
        excludedItemsLength: 0,
        includedItemsDisplay: 'none',
        excludedItemsDisplay: 'none',
        productName: product.name,
        error: error.message || String(error),
      };
    }
    
    // Verifica la risposta
    const response = data as any;
    console.log(`   ✅ Email inviata`);
    
    const includedItemsLength = response.params?.INCLUDED_ITEMS_LENGTH || 0;
    const excludedItemsLength = response.params?.EXCLUDED_ITEMS_LENGTH || 0;
    const includedItemsDisplay = response.params?.INCLUDED_ITEMS_DISPLAY || 'none';
    const excludedItemsDisplay = response.params?.EXCLUDED_ITEMS_DISPLAY || 'none';
    
    console.log(`   📊 Risposta:`);
    console.log(`      INCLUDED_ITEMS_LENGTH: ${includedItemsLength}`);
    console.log(`      EXCLUDED_ITEMS_LENGTH: ${excludedItemsLength}`);
    console.log(`      INCLUDED_ITEMS_DISPLAY: ${includedItemsDisplay}`);
    console.log(`      EXCLUDED_ITEMS_DISPLAY: ${excludedItemsDisplay}`);
    
    // Verifica che i dati siano stati passati correttamente
    const expectedIncludedLength = includedItems.length > 0 ? includedItems.length : 0;
    const expectedExcludedLength = excludedItems.length > 0 ? excludedItems.length : 0;
    
    const success = 
      (expectedIncludedLength === 0 && includedItemsLength === 0 && includedItemsDisplay === 'none') ||
      (expectedIncludedLength > 0 && includedItemsLength > 0 && includedItemsDisplay === 'block') &&
      (expectedExcludedLength === 0 && excludedItemsLength === 0 && excludedItemsDisplay === 'none') ||
      (expectedExcludedLength > 0 && excludedItemsLength > 0 && excludedItemsDisplay === 'block');
    
    if (!success) {
      console.error(`   ⚠️  PROBLEMA: Dati non corrispondono!`);
      console.error(`      Expected included: ${expectedIncludedLength}, Got: ${includedItemsLength}, Display: ${includedItemsDisplay}`);
      console.error(`      Expected excluded: ${expectedExcludedLength}, Got: ${excludedItemsLength}, Display: ${excludedItemsDisplay}`);
    } else {
      console.log(`   ✅ Dati corretti!`);
    }
    
    return {
      testNumber,
      success,
      includedItemsLength,
      excludedItemsLength,
      includedItemsDisplay,
      excludedItemsDisplay,
      productName: product.name,
    };
  } catch (err) {
    console.error(`   ❌ Errore durante invio:`, err);
    return {
      testNumber,
      success: false,
      includedItemsLength: 0,
      excludedItemsLength: 0,
      includedItemsDisplay: 'none',
      excludedItemsDisplay: 'none',
      productName: product.name,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runTests() {
  console.log('🧪 TEST 10 EMAIL REALI CON INCLUDED/EXCLUDED ITEMS\n');
  console.log('=' .repeat(60));
  
  // Cerca prodotti con included/excluded items (priorità ai prodotti TEST)
  const products: any[] = [];
  
  // Prima cerca i prodotti TEST che sappiamo avere i dati
  const { data: testTrips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .ilike('name', '%TEST%')
    .eq('active', true)
    .limit(5);
  
  if (testTrips) {
    testTrips.forEach(t => products.push({ ...t, type: 'trip' }));
  }
  
  // Poi cerca altri prodotti con dati
  const { data: trips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .not('included_items', 'is', null)
    .eq('active', true)
    .limit(3);
  
  if (trips) {
    trips.forEach(t => {
      if (!products.find(p => p.id === t.id)) {
        products.push({ ...t, type: 'trip' });
      }
    });
  }
  
  // Cerca in experience
  const { data: experiences } = await supabase
    .from('experience')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .not('included_items', 'is', null)
    .eq('active', true)
    .limit(2);
  
  if (experiences) {
    experiences.forEach(e => products.push({ ...e, type: 'experience' }));
  }
  
  console.log(`📦 Trovati ${products.length} prodotti per test`);
  
  if (products.length === 0) {
    console.error('❌ Nessun prodotto trovato con included/excluded items!');
    console.log('💡 Esegui update-test-products-for-email.ts per popolare i dati');
    return;
  }
  
  // Mostra i prodotti trovati
  products.forEach((p, i) => {
    const included = Array.isArray(p.included_items) ? p.included_items.length : 0;
    const excluded = Array.isArray(p.excluded_items) ? p.excluded_items.length : 0;
    console.log(`   ${i + 1}. ${p.name} (${p.type}) - Included: ${included}, Excluded: ${excluded}`);
  });
  
  // Esegui 10 test
  const results: TestResult[] = [];
  for (let i = 0; i < 10; i++) {
    const product = products[i % products.length]; // Cicla sui prodotti disponibili
    const result = await sendTestEmail(i + 1, product);
    results.push(result);
    
    // Attendi 1 secondo tra un test e l'altro per non sovraccaricare
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Riepilogo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO TEST\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withIncludedItems = results.filter(r => r.includedItemsLength > 0).length;
  const withExcludedItems = results.filter(r => r.excludedItemsLength > 0).length;
  
  console.log(`✅ Test riusciti: ${successful}/10`);
  console.log(`❌ Test falliti: ${failed}/10`);
  console.log(`📋 Test con included items valorizzati: ${withIncludedItems}/10`);
  console.log(`📋 Test con excluded items valorizzati: ${withExcludedItems}/10`);
  
  console.log('\n📝 Dettaglio risultati:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const includedStatus = r.includedItemsLength > 0 ? '✅' : '⚪';
    const excludedStatus = r.excludedItemsLength > 0 ? '✅' : '⚪';
    console.log(`   ${status} Test ${r.testNumber}: ${r.productName}`);
    console.log(`      ${includedStatus} Included: ${r.includedItemsLength} chars, Display: ${r.includedItemsDisplay}`);
    console.log(`      ${excludedStatus} Excluded: ${r.excludedItemsLength} chars, Display: ${r.excludedItemsDisplay}`);
    if (r.error) {
      console.log(`      ❌ Errore: ${r.error}`);
    }
  });
  
  // Verifica finale
  const allCorrect = results.every(r => r.success);
  const hasDataTests = results.filter(r => r.includedItemsLength > 0 || r.excludedItemsLength > 0);
  
  console.log('\n' + '='.repeat(60));
  if (allCorrect && hasDataTests.length > 0) {
    console.log('✅ TUTTI I TEST SONO CORRETTI!');
    console.log(`   ${hasDataTests.length} test hanno incluso dati included/excluded items`);
    console.log('   I parametri arrivano correttamente valorizzati a Brevo.');
  } else if (allCorrect) {
    console.log('⚠️  TEST COMPLETATI MA NESSUN DATO DA VERIFICARE');
    console.log('   I prodotti testati non hanno included/excluded items nel database.');
  } else {
    console.log('⚠️  ALCUNI TEST HANNO PROBLEMI');
    console.log('   Verifica i log di Supabase per dettagli.');
  }
  console.log('='.repeat(60));
}

// Esegui i test
runTests().catch(console.error);

