/**
 * Script per testare le correzioni all'email di conferma:
 * 1. Verifica formato valuta (€ invece di "eur")
 * 2. Verifica orario (solo se presente nel prodotto, non dallo slot)
 * 3. Verifica policy di cancellazione (sempre presente)
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
  productName: string;
  currencyFormat: string;
  hasTime: boolean;
  timeSource: 'product' | 'slot' | 'none';
  hasCancellationPolicy: boolean;
  cancellationPolicyDisplay: string;
  error?: string;
}

async function testEmailFixes(testNumber: number, product: any, productType: 'experience' | 'class' | 'trip'): Promise<TestResult> {
  console.log(`\n📧 TEST ${testNumber}`);
  console.log(`   Prodotto: ${product.name}`);
  console.log(`   Tipo: ${productType}`);
  console.log(`   ID: ${product.id}`);
  
  // Verifica formato valuta
  const testCurrencies = ['EUR', 'eur', 'Eur', 'EUr'];
  const testCurrency = testCurrencies[testNumber % testCurrencies.length];
  console.log(`   💶 Test currency: ${testCurrency}`);
  
  // Verifica orario prodotto
  const productStartTime = product.full_day_start_time;
  const productEndTime = product.full_day_end_time;
  const hasProductTime = !!productStartTime;
  
  const formatTimeForDisplay = (timeStr: string | null | undefined): string => {
    if (!timeStr) return '';
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return timeStr;
  };
  
  let productTime: string | undefined = undefined;
  if (productStartTime) {
    const formattedStartTime = formatTimeForDisplay(productStartTime);
    if (productEndTime) {
      const formattedEndTime = formatTimeForDisplay(productEndTime);
      productTime = `${formattedStartTime} - ${formattedEndTime}`;
    } else {
      productTime = formattedStartTime;
    }
  }
  
  console.log(`   ⏰ Orario prodotto: ${productTime || 'NON PRESENTE'}`);
  console.log(`   📋 Policy cancellazione: ${product.cancellation_policy ? 'PRESENTE' : 'ASSENTE'}`);
  
  // Costruisci il payload email
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-fixes-${Date.now()}-${testNumber}`,
    customerEmail: 'ceciliacaprioli9@gmail.com',
    customerName: 'Cecilia',
    customerSurname: 'Caprioli',
    productName: product.name,
    productDescription: product.description || undefined,
    productType: productType,
    bookingDate: '2025-12-27',
    bookingTime: productTime || undefined, // Solo orario prodotto, non slot
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 750.02,
    currency: testCurrency, // Test con diverse varianti
    orderNumber: `TEST${testNumber}`,
    noAdults: product.no_adults === true || product.no_adults === 1,
    includedItems: Array.isArray(product.included_items) && product.included_items.length > 0 
      ? product.included_items 
      : undefined,
    excludedItems: Array.isArray(product.excluded_items) && product.excluded_items.length > 0 
      ? product.excluded_items 
      : undefined,
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
        productName: product.name,
        currencyFormat: 'ERROR',
        hasTime: false,
        timeSource: 'none',
        hasCancellationPolicy: false,
        cancellationPolicyDisplay: 'none',
        error: error.message || String(error),
      };
    }
    
    // Verifica la risposta
    console.log(`   ✅ Email inviata`);
    console.log(`   📊 Risposta:`, JSON.stringify(data, null, 2));
    
    // Verifica formato valuta nella risposta
    const currencyFormat = data?.params?.TOTAL_AMOUNT || '';
    const hasCorrectCurrency = currencyFormat.includes('€') && !currencyFormat.toLowerCase().includes('eur');
    
    // Verifica orario
    const bookingTimeDisplay = data?.params?.BOOKING_TIME || '';
    const bookingTimeDisplayStyle = data?.params?.BOOKING_TIME_DISPLAY || 'none';
    const hasTime = bookingTimeDisplayStyle === 'flex' && !!bookingTimeDisplay;
    const timeSource = hasProductTime && hasTime ? 'product' : hasTime ? 'slot' : 'none';
    
    // Verifica policy cancellazione
    const cancellationPolicyDisplay = data?.params?.CANCELLATION_POLICY_DISPLAY || 'none';
    const hasCancellationPolicy = cancellationPolicyDisplay === 'block';
    
    console.log(`   💶 Formato valuta: ${currencyFormat} ${hasCorrectCurrency ? '✅' : '❌'}`);
    console.log(`   ⏰ Orario mostrato: ${hasTime ? 'SÌ' : 'NO'} (fonte: ${timeSource})`);
    console.log(`   📋 Policy mostrata: ${hasCancellationPolicy ? 'SÌ' : 'NO'} ${hasCancellationPolicy ? '✅' : '❌'}`);
    
    return {
      testNumber,
      success: true,
      productName: product.name,
      currencyFormat,
      hasTime,
      timeSource,
      hasCancellationPolicy,
      cancellationPolicyDisplay,
    };
  } catch (err) {
    console.error(`   ❌ Errore:`, err);
    return {
      testNumber,
      success: false,
      productName: product.name,
      currencyFormat: 'ERROR',
      hasTime: false,
      timeSource: 'none',
      hasCancellationPolicy: false,
      cancellationPolicyDisplay: 'none',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log('🧪 TEST EMAIL FIXES');
  console.log('==================');
  console.log('\nVerifica:');
  console.log('1. Formato valuta: € invece di "eur"');
  console.log('2. Orario: solo se presente nel prodotto (full_day_start_time/end_time)');
  console.log('3. Policy cancellazione: sempre presente\n');
  
  const results: TestResult[] = [];
  
  // Test 1: Prodotto con orario e policy
  console.log('\n📋 TEST 1: Prodotto con orario e policy');
  const { data: product1 } = await supabase
    .from('experience')
    .select('id, name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time')
    .not('cancellation_policy', 'is', null)
    .not('full_day_start_time', 'is', null)
    .limit(1)
    .single();
  
  if (product1) {
    const result1 = await testEmailFixes(1, product1, 'experience');
    results.push(result1);
  }
  
  // Test 2: Prodotto senza orario ma con policy
  console.log('\n📋 TEST 2: Prodotto senza orario ma con policy');
  const { data: product2 } = await supabase
    .from('class')
    .select('id, name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time')
    .not('cancellation_policy', 'is', null)
    .is('full_day_start_time', null)
    .limit(1)
    .single();
  
  if (product2) {
    const result2 = await testEmailFixes(2, product2, 'class');
    results.push(result2);
  }
  
  // Test 3: Trip (sempre senza orario)
  console.log('\n📋 TEST 3: Trip (sempre senza orario)');
  const { data: product3 } = await supabase
    .from('trip')
    .select('id, name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .not('cancellation_policy', 'is', null)
    .limit(1)
    .single();
  
  if (product3) {
    const result3 = await testEmailFixes(3, product3, 'trip');
    results.push(result3);
  }
  
  // Riepilogo
  console.log('\n\n📊 RIEPILOGO TEST');
  console.log('==================');
  
  let allPassed = true;
  for (const result of results) {
    const currencyOk = result.currencyFormat.includes('€') && !result.currencyFormat.toLowerCase().includes('eur');
    const timeOk = result.timeSource === 'product' || (result.timeSource === 'none' && !result.hasTime);
    const policyOk = result.hasCancellationPolicy;
    
    const testPassed = currencyOk && timeOk && policyOk;
    allPassed = allPassed && testPassed;
    
    console.log(`\nTest ${result.testNumber}: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Prodotto: ${result.productName}`);
    console.log(`   Valuta: ${result.currencyFormat} ${currencyOk ? '✅' : '❌'}`);
    console.log(`   Orario: ${result.hasTime ? 'SÌ' : 'NO'} (fonte: ${result.timeSource}) ${timeOk ? '✅' : '❌'}`);
    console.log(`   Policy: ${result.hasCancellationPolicy ? 'SÌ' : 'NO'} ${policyOk ? '✅' : '❌'}`);
    if (result.error) {
      console.log(`   Errore: ${result.error}`);
    }
  }
  
  console.log(`\n\n${allPassed ? '✅ TUTTI I TEST PASSATI' : '❌ ALCUNI TEST FALLITI'}`);
  
  if (allPassed) {
    console.log('\n✅ Le correzioni funzionano correttamente!');
    console.log('   - Formato valuta: sempre €');
    console.log('   - Orario: solo se presente nel prodotto');
    console.log('   - Policy cancellazione: sempre presente');
  } else {
    console.log('\n❌ Alcune correzioni non funzionano correttamente.');
    console.log('   Controlla i dettagli sopra.');
  }
}

main().catch(console.error);

