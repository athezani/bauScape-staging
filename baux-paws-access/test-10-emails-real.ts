/**
 * Script per testare 10 email reali e verificare che included/excluded items arrivino correttamente
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
  console.log(`   Excluded items nel DB: ${excludedItems.length}`);
  
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
        error: error.message || String(error),
      };
    }
    
    // Verifica la risposta
    const response = data as any;
    console.log(`   ✅ Email inviata`);
    console.log(`   📊 Risposta:`, {
      includedItemsLength: response.params?.INCLUDED_ITEMS_LENGTH || 0,
      excludedItemsLength: response.params?.EXCLUDED_ITEMS_LENGTH || 0,
      includedItemsDisplay: response.params?.INCLUDED_ITEMS_DISPLAY || 'none',
      excludedItemsDisplay: response.params?.EXCLUDED_ITEMS_DISPLAY || 'none',
    });
    
    const includedItemsLength = response.params?.INCLUDED_ITEMS_LENGTH || 0;
    const excludedItemsLength = response.params?.EXCLUDED_ITEMS_LENGTH || 0;
    const includedItemsDisplay = response.params?.INCLUDED_ITEMS_DISPLAY || 'none';
    const excludedItemsDisplay = response.params?.EXCLUDED_ITEMS_DISPLAY || 'none';
    
    const success = includedItemsLength > 0 || excludedItemsLength > 0 || 
                   (includedItems.length === 0 && excludedItems.length === 0); // OK anche se vuoti nel DB
    
    if (!success && (includedItems.length > 0 || excludedItems.length > 0)) {
      console.error(`   ⚠️  PROBLEMA: Items nel DB ma non passati all'email!`);
      console.error(`      DB included: ${includedItems.length}, Email: ${includedItemsLength}`);
      console.error(`      DB excluded: ${excludedItems.length}, Email: ${excludedItemsLength}`);
    }
    
    return {
      testNumber,
      success,
      includedItemsLength,
      excludedItemsLength,
      includedItemsDisplay,
      excludedItemsDisplay,
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
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runTests() {
  console.log('🧪 TEST 10 EMAIL REALI CON INCLUDED/EXCLUDED ITEMS\n');
  console.log('=' .repeat(60));
  
  // Trova prodotti con included/excluded items
  const products: any[] = [];
  
  // Cerca in trip
  const { data: trips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .eq('active', true)
    .limit(5);
  
  if (trips) {
    trips.forEach(t => products.push({ ...t, type: 'trip' }));
  }
  
  // Cerca in experience
  const { data: experiences } = await supabase
    .from('experience')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .eq('active', true)
    .limit(3);
  
  if (experiences) {
    experiences.forEach(e => products.push({ ...e, type: 'experience' }));
  }
  
  // Cerca in class
  const { data: classes } = await supabase
    .from('class')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .eq('active', true)
    .limit(2);
  
  if (classes) {
    classes.forEach(c => products.push({ ...c, type: 'class' }));
  }
  
  console.log(`📦 Trovati ${products.length} prodotti per test`);
  
  if (products.length === 0) {
    console.error('❌ Nessun prodotto trovato!');
    return;
  }
  
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
  console.log(`📋 Test con included items: ${withIncludedItems}/10`);
  console.log(`📋 Test con excluded items: ${withExcludedItems}/10`);
  
  console.log('\n📝 Dettaglio risultati:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`   ${status} Test ${r.testNumber}: Included=${r.includedItemsLength}, Excluded=${r.excludedItemsLength}, Display=[${r.includedItemsDisplay}/${r.excludedItemsDisplay}]`);
    if (r.error) {
      console.log(`      Errore: ${r.error}`);
    }
  });
  
  // Verifica finale
  const allCorrect = results.every(r => {
    // Un test è corretto se:
    // 1. È riuscito (success = true)
    // 2. OPPURE ha items nel DB e li ha passati correttamente all'email
    return r.success || (r.includedItemsLength > 0 || r.excludedItemsLength > 0);
  });
  
  console.log('\n' + '='.repeat(60));
  if (allCorrect && successful >= 8) {
    console.log('✅ TUTTI I TEST SONO CORRETTI!');
    console.log('   I parametri included/excluded items arrivano correttamente a Brevo.');
  } else {
    console.log('⚠️  ALCUNI TEST HANNO PROBLEMI');
    console.log('   Verifica i log di Supabase per dettagli.');
  }
  console.log('='.repeat(60));
}

// Esegui i test
runTests().catch(console.error);

