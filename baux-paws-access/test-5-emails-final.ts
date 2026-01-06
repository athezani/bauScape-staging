/**
 * Script per testare 5 email finali dopo le correzioni
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
  console.log(`\n📧 TEST ${testNumber}/5`);
  console.log(`   Prodotto: ${product.name}`);
  console.log(`   Tipo: ${product.type || 'trip'}`);
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : [];
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : [];
  
  console.log(`   Included items: ${includedItems.length}`);
  console.log(`   Excluded items: ${excludedItems.length}`);
  
  // Costruisci il payload email
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-final-${Date.now()}-${testNumber}`,
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
    orderNumber: `FINAL${testNumber}`,
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
    console.log(`   ✅ Email inviata con successo!`);
    
    const includedItemsLength = response.params?.INCLUDED_ITEMS_LENGTH || 0;
    const excludedItemsLength = response.params?.EXCLUDED_ITEMS_LENGTH || 0;
    const includedItemsDisplay = response.params?.INCLUDED_ITEMS_DISPLAY || 'none';
    const excludedItemsDisplay = response.params?.EXCLUDED_ITEMS_DISPLAY || 'none';
    
    console.log(`   📊 Parametri inviati a Brevo:`);
    console.log(`      INCLUDED_ITEMS: ${includedItemsLength} caratteri, Display: ${includedItemsDisplay}`);
    console.log(`      EXCLUDED_ITEMS: ${excludedItemsLength} caratteri, Display: ${excludedItemsDisplay}`);
    
    // Verifica che i dati siano stati passati correttamente
    const expectedIncludedLength = includedItems.length > 0 ? includedItems.length : 0;
    const expectedExcludedLength = excludedItems.length > 0 ? excludedItems.length : 0;
    
    const success = 
      (expectedIncludedLength === 0 && includedItemsLength === 0 && includedItemsDisplay === 'none') ||
      (expectedIncludedLength > 0 && includedItemsLength > 0 && includedItemsDisplay === 'block') &&
      (expectedExcludedLength === 0 && excludedItemsLength === 0 && excludedItemsDisplay === 'none') ||
      (expectedExcludedLength > 0 && excludedItemsLength > 0 && excludedItemsDisplay === 'block');
    
    if (success) {
      console.log(`   ✅ Dati corretti e formattati correttamente!`);
    } else {
      console.error(`   ⚠️  Problema con i dati!`);
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
  console.log('🧪 TEST FINALE: 5 EMAIL DOPO CORREZIONI\n');
  console.log('=' .repeat(60));
  console.log('Verifica:');
  console.log('  - Triple braces {{{ }}} per HTML');
  console.log('  - Colore verde per checkmark included items');
  console.log('  - Colore rosso per X excluded items');
  console.log('  - Parametri valorizzati correttamente');
  console.log('=' .repeat(60));
  
  // Cerca prodotti con included/excluded items (priorità ai prodotti TEST)
  const products: any[] = [];
  
  // Prima cerca i prodotti TEST che sappiamo avere i dati
  const { data: testTrips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .ilike('name', '%TEST EMAIL%')
    .eq('active', true)
    .limit(3);
  
  if (testTrips) {
    testTrips.forEach(t => products.push({ ...t, type: 'trip' }));
  }
  
  // Cerca altri prodotti con dati
  const { data: testExperiences } = await supabase
    .from('experience')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .ilike('name', '%TEST EMAIL%')
    .eq('active', true)
    .limit(2);
  
  if (testExperiences) {
    testExperiences.forEach(e => products.push({ ...e, type: 'experience' }));
  }
  
  // Se non abbiamo abbastanza prodotti TEST, aggiungi altri
  if (products.length < 5) {
    const { data: moreTrips } = await supabase
      .from('trip')
      .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
      .not('included_items', 'is', null)
      .eq('active', true)
      .limit(5 - products.length);
    
    if (moreTrips) {
      moreTrips.forEach(t => {
        if (!products.find(p => p.id === t.id)) {
          products.push({ ...t, type: 'trip' });
        }
      });
    }
  }
  
  console.log(`\n📦 Trovati ${products.length} prodotti per test\n`);
  
  if (products.length === 0) {
    console.error('❌ Nessun prodotto trovato con included/excluded items!');
    return;
  }
  
  // Mostra i prodotti trovati
  products.slice(0, 5).forEach((p, i) => {
    const included = Array.isArray(p.included_items) ? p.included_items.length : 0;
    const excluded = Array.isArray(p.excluded_items) ? p.excluded_items.length : 0;
    console.log(`   ${i + 1}. ${p.name} (${p.type}) - Included: ${included}, Excluded: ${excluded}`);
  });
  
  // Esegui 5 test
  const results: TestResult[] = [];
  for (let i = 0; i < 5; i++) {
    const product = products[i % products.length];
    const result = await sendTestEmail(i + 1, product);
    results.push(result);
    
    // Attendi 1 secondo tra un test e l'altro
    if (i < 4) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Riepilogo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO TEST FINALI\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withIncludedItems = results.filter(r => r.includedItemsLength > 0).length;
  const withExcludedItems = results.filter(r => r.excludedItemsLength > 0).length;
  
  console.log(`✅ Test riusciti: ${successful}/5`);
  console.log(`❌ Test falliti: ${failed}/5`);
  console.log(`📋 Test con included items valorizzati: ${withIncludedItems}/5`);
  console.log(`📋 Test con excluded items valorizzati: ${withExcludedItems}/5`);
  
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
    console.log('   Verifica le email ricevute per confermare il rendering HTML.');
  } else if (allCorrect) {
    console.log('⚠️  TEST COMPLETATI MA NESSUN DATO DA VERIFICARE');
    console.log('   I prodotti testati non hanno included/excluded items nel database.');
  } else {
    console.log('⚠️  ALCUNI TEST HANNO PROBLEMI');
    console.log('   Verifica i log di Supabase per dettagli.');
  }
  console.log('='.repeat(60));
  console.log('\n💡 Controlla la casella email alessandro.dezzani@lastminute.com');
  console.log('   per verificare che le sezioni appaiano correttamente con:');
  console.log('   - Checkmark verdi per "Cosa è incluso"');
  console.log('   - X rosse per "Cosa non è incluso"');
  console.log('   - HTML formattato correttamente');
}

// Esegui i test
runTests().catch(console.error);

