/**
 * Script per verificare che i parametri INCLUDED_ITEMS ed EXCLUDED_ITEMS
 * vengano effettivamente inviati a Brevo
 * 
 * Invia una singola email di test e mostra tutti i log
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSingleEmail() {
  console.log('🧪 TEST SINGOLA EMAIL CON INCLUDED/EXCLUDED ITEMS\n');
  
  // Trova un prodotto con items
  const { data: products } = await supabase
    .from('experience')
    .select('id, name, included_items, excluded_items')
    .not('included_items', 'is', null)
    .limit(1)
    .single();
  
  if (!products) {
    console.error('❌ Nessun prodotto trovato');
    return;
  }
  
  console.log('📦 Prodotto selezionato:', products.name);
  console.log('   Included items:', products.included_items);
  console.log('   Excluded items:', products.excluded_items);
  console.log('');
  
  // Prepara payload
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `verify-test-${Date.now()}`,
    customerEmail: 'test@flixdog.com',
    customerName: 'Test',
    customerSurname: 'User',
    productName: products.name,
    productDescription: 'Test verification',
    productType: 'experience',
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: '10:00 - 12:00',
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 100.00,
    currency: 'EUR',
    orderNumber: 'VERIFY001',
    noAdults: false,
    includedItems: products.included_items,
    excludedItems: products.excluded_items,
    meetingInfo: {
      text: 'Test meeting point',
      googleMapsLink: 'https://maps.google.com'
    },
    showMeetingInfo: true,
    cancellationPolicy: 'Test policy',
  };
  
  console.log('📤 Invio email...');
  console.log('Payload:', JSON.stringify(emailPayload, null, 2));
  console.log('');
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-transactional-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify(emailPayload),
    }
  );
  
  const result = await response.json();
  
  console.log('📥 Risposta:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
  
  if (result.params) {
    console.log('✅ Parametri nella risposta:');
    console.log('   INCLUDED_ITEMS_LENGTH:', result.params.INCLUDED_ITEMS_LENGTH);
    console.log('   EXCLUDED_ITEMS_LENGTH:', result.params.EXCLUDED_ITEMS_LENGTH);
    console.log('   INCLUDED_ITEMS_DISPLAY:', result.params.INCLUDED_ITEMS_DISPLAY);
    console.log('   EXCLUDED_ITEMS_DISPLAY:', result.params.EXCLUDED_ITEMS_DISPLAY);
  } else {
    console.log('⚠️  Parametri non presenti nella risposta');
    console.log('   Verifica i log di Supabase per vedere cosa è stato inviato a Brevo');
  }
  
  console.log('');
  console.log('💡 Prossimi passi:');
  console.log('   1. Vai su Supabase Dashboard → Logs → Edge Functions → send-transactional-email');
  console.log('   2. Cerca i log con "=== INCLUDED_ITEMS PARAMETER ==="');
  console.log('   3. Verifica che i parametri siano presenti nel payload Brevo');
  console.log('   4. Verifica in Brevo Dashboard che i parametri siano stati ricevuti');
}

testSingleEmail().catch(console.error);

