/**
 * Script per inviare email di test a ceciliacaprioli9@gmail.com
 * per verificare le correzioni:
 * 1. Formato valuta (€ invece di "eur")
 * 2. Orario solo se presente nel prodotto
 * 3. Policy cancellazione sempre presente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendTestEmail() {
  console.log('📧 Invio email di test a ceciliacaprioli9@gmail.com\n');
  
  // Cerca un prodotto con orario e policy
  const { data: product } = await supabase
    .from('experience')
    .select('id, name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time')
    .not('cancellation_policy', 'is', null)
    .not('full_day_start_time', 'is', null)
    .limit(1)
    .single();
  
  if (!product) {
    console.error('❌ Nessun prodotto trovato con orario e policy');
    Deno.exit(1);
  }
  
  console.log(`✅ Prodotto trovato: ${product.name}`);
  console.log(`   Orario: ${product.full_day_start_time}${product.full_day_end_time ? ` - ${product.full_day_end_time}` : ''}`);
  console.log(`   Policy: ${product.cancellation_policy ? 'Presente' : 'Assente'}\n`);
  
  // Formatta orario prodotto
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
  if (product.full_day_start_time) {
    const formattedStartTime = formatTimeForDisplay(product.full_day_start_time);
    if (product.full_day_end_time) {
      const formattedEndTime = formatTimeForDisplay(product.full_day_end_time);
      productTime = `${formattedStartTime} - ${formattedEndTime}`;
    } else {
      productTime = formattedStartTime;
    }
  }
  
  // Test con diverse varianti di currency
  const testCurrencies = ['EUR', 'eur', 'Eur'];
  
  for (let i = 0; i < testCurrencies.length; i++) {
    const testCurrency = testCurrencies[i];
    console.log(`📤 Test ${i + 1}/3: Currency = "${testCurrency}"`);
    
    const emailPayload = {
      type: 'order_confirmation',
      bookingId: `test-cecilia-fixes-${Date.now()}-${i}`,
      customerEmail: 'ceciliacaprioli9@gmail.com',
      customerName: 'Cecilia',
      customerSurname: 'Caprioli',
      productName: product.name,
      productDescription: product.description || undefined,
      productType: 'experience',
      bookingDate: '2025-12-27',
      bookingTime: productTime || undefined, // Solo orario prodotto
      numberOfAdults: 2,
      numberOfDogs: 1,
      totalAmount: 750.02, // Test con importo che mostra il problema "eur750.02"
      currency: testCurrency, // Test con diverse varianti
      orderNumber: `TEST${i + 1}`,
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
    
    try {
      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: emailPayload,
      });
      
      if (error) {
        console.error(`   ❌ Errore:`, error);
      } else {
        console.log(`   ✅ Email inviata con successo!`);
        console.log(`   💶 Formato valuta nella risposta: ${data?.params?.TOTAL_AMOUNT || 'N/A'}`);
        console.log(`   ⏰ Orario mostrato: ${data?.params?.BOOKING_TIME_DISPLAY === 'flex' ? 'SÌ' : 'NO'}`);
        console.log(`   📋 Policy mostrata: ${data?.params?.CANCELLATION_POLICY_DISPLAY === 'block' ? 'SÌ' : 'NO'}`);
        
        // Verifica formato valuta
        const currencyFormat = data?.params?.TOTAL_AMOUNT || '';
        const hasCorrectCurrency = currencyFormat.includes('€') && !currencyFormat.toLowerCase().includes('eur');
        console.log(`   ${hasCorrectCurrency ? '✅' : '❌'} Formato valuta corretto: ${hasCorrectCurrency ? 'SÌ' : 'NO'}`);
      }
    } catch (err) {
      console.error(`   ❌ Errore:`, err);
    }
    
    // Attendi 2 secondi tra un invio e l'altro
    if (i < testCurrencies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✅ Test completato!');
  console.log('📧 Controlla la casella email ceciliacaprioli9@gmail.com');
  console.log('\nVerifica:');
  console.log('1. Il prezzo mostra "€750.02" e NON "eur750.02"');
  console.log('2. L\'orario è mostrato solo se presente nel prodotto');
  console.log('3. La policy di cancellazione è sempre presente');
}

sendTestEmail().catch(console.error);

