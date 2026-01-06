/**
 * Script per testare l'invio di email con policy di cancellazione
 * Verifica che la cancellation policy venga mostrata correttamente nell'email
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') 
  || Deno.env.get('SUPABASE_SERVICE_KEY')
  || Deno.env.get('SUPABASE_ANON_KEY') // Fallback to anon key for testing
  || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  console.error('💡 Esegui lo script con: SUPABASE_SERVICE_ROLE_KEY=your_key deno run test-email-cancellation-policy.ts');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendTestEmail() {
  console.log('🧪 TEST EMAIL CON CANCELLATION POLICY\n');
  console.log('='.repeat(60));
  
  // Cerca un prodotto con cancellation_policy (priorità ai prodotti TEST)
  let product: any = null;
  
  // Prima cerca prodotti TEST
  const { data: testTrips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .ilike('name', '%TEST EMAIL%')
    .not('cancellation_policy', 'is', null)
    .eq('active', true)
    .limit(1)
    .single();
  
  if (testTrips) {
    product = { ...testTrips, type: 'trip' };
  }
  
  // Se non trovato, cerca altri prodotti con cancellation_policy
  if (!product) {
    const { data: trips } = await supabase
      .from('trip')
      .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
      .not('cancellation_policy', 'is', null)
      .eq('active', true)
      .limit(1)
      .single();
    
    if (trips) {
      product = { ...trips, type: 'trip' };
    }
  }
  
  // Se ancora non trovato, cerca in experience
  if (!product) {
    const { data: experiences } = await supabase
      .from('experience')
      .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
      .not('cancellation_policy', 'is', null)
      .eq('active', true)
      .limit(1)
      .single();
    
    if (experiences) {
      product = { ...experiences, type: 'experience' };
    }
  }
  
  if (!product) {
    console.error('❌ Nessun prodotto trovato con cancellation_policy!');
    console.log('💡 Esegui update-test-products-for-email.ts per popolare i dati');
    return;
  }
  
  console.log(`📦 Prodotto trovato: ${product.name}`);
  console.log(`   Tipo: ${product.type}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Cancellation Policy: ${product.cancellation_policy ? '✅ Presente' : '❌ Assente'}`);
  if (product.cancellation_policy) {
    console.log(`   Lunghezza: ${product.cancellation_policy.length} caratteri`);
    console.log(`   Primi 100 caratteri: ${product.cancellation_policy.substring(0, 100)}...`);
  }
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : [];
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : [];
  
  console.log(`   Included items: ${includedItems.length}`);
  console.log(`   Excluded items: ${excludedItems.length}`);
  console.log(`   Meeting info: ${product.meeting_info ? 'Presente' : 'Assente'}`);
  console.log('');
  
  // Costruisci il payload email - CRITICAL: usa null invece di undefined per JSON serialization
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-cancellation-${Date.now()}`,
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
    orderNumber: 'TEST-CANCEL',
    noAdults: false,
    // CRITICAL: Always include all fields, even if undefined (convert to null for JSON serialization)
    includedItems: includedItems.length > 0 ? includedItems : null,
    excludedItems: excludedItems.length > 0 ? excludedItems : null,
    meetingInfo: product.meeting_info && typeof product.meeting_info === 'object'
      ? {
          text: product.meeting_info.text || '',
          googleMapsLink: product.meeting_info.google_maps_link || '',
        }
      : null,
    showMeetingInfo: product.show_meeting_info === true || product.show_meeting_info === 1,
    cancellationPolicy: product.cancellation_policy ?? null, // CRITICAL: Use null only if undefined, keep string if present
  };
  
  console.log('📤 Payload email preparato:');
  console.log(`   Cancellation Policy nel payload: ${emailPayload.cancellationPolicy ? '✅ Presente' : '❌ Assente'}`);
  if (emailPayload.cancellationPolicy) {
    console.log(`   Tipo: ${typeof emailPayload.cancellationPolicy}`);
    console.log(`   Lunghezza: ${emailPayload.cancellationPolicy.length} caratteri`);
    console.log(`   Valore: ${emailPayload.cancellationPolicy.substring(0, 100)}...`);
  }
  console.log('');
  console.log('📋 Payload JSON completo (solo cancellationPolicy):');
  console.log(JSON.stringify({ cancellationPolicy: emailPayload.cancellationPolicy }, null, 2));
  console.log('');
  
  try {
    console.log('📧 Invio email...');
    
    // Chiama la funzione send-transactional-email
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailPayload,
    });
    
    if (error) {
      console.error('❌ Errore durante invio email:', error);
      return;
    }
    
    console.log('✅ Email inviata con successo!');
    console.log('');
    console.log('📊 Risposta dalla funzione:');
    
    // Verifica i parametri nella risposta
    const response = data as any;
    
    // Debug: mostra cosa è stato ricevuto
    if (response.debug) {
      console.log('🔍 DEBUG - Valore ricevuto dalla funzione:');
      console.log(`   ${response.debug.cancellationPolicyReceived}`);
      console.log(`   Valore: ${response.debug.cancellationPolicyReceivedValue}`);
    }
    
    if (response.params) {
      console.log(`   CANCELLATION_POLICY presente: ${response.params.CANCELLATION_POLICY && response.params.CANCELLATION_POLICY !== 'EMPTY' ? '✅' : '❌'}`);
      console.log(`   CANCELLATION_POLICY length: ${response.params.CANCELLATION_POLICY_LENGTH || 0}`);
      console.log(`   CANCELLATION_POLICY_DISPLAY: ${response.params.CANCELLATION_POLICY_DISPLAY || 'none'}`);
      
      if (response.params.CANCELLATION_POLICY && response.params.CANCELLATION_POLICY !== 'EMPTY') {
        console.log(`   Primi 100 caratteri: ${response.params.CANCELLATION_POLICY}`);
      }
      
      console.log('');
      console.log('✅ Verifica completata!');
      console.log('📧 Controlla la tua email per verificare che la policy di cancellazione sia presente.');
    } else {
      console.log('⚠️  Risposta senza parametri');
    }
    
  } catch (err) {
    console.error('❌ Errore durante invio:', err);
  }
}

// Esegui il test
sendTestEmail().catch(console.error);

