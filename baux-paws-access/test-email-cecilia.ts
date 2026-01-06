/**
 * Script per testare l'invio di email di conferma con tutti i dati
 * Invia a ceciliacaprioli9@gmail.com
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
  console.log('🧪 TEST EMAIL CONFERMA PRENOTAZIONE\n');
  console.log('=' .repeat(60));
  
  // Cerca un prodotto con included/excluded items o programma
  let product: any = null;
  
  // Prima prova a cercare in trip
  const { data: trips } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, program')
    .eq('active', true)
    .limit(5);
  
  if (trips && trips.length > 0) {
    // Cerca uno con included/excluded items o programma
    product = trips.find(p => 
      (Array.isArray(p.included_items) && p.included_items.length > 0) ||
      (Array.isArray(p.excluded_items) && p.excluded_items.length > 0) ||
      p.program
    ) || trips[0];
    if (product) product.type = 'trip';
  }
  
  // Se non trovato, cerca in experience
  if (!product) {
    const { data: experiences } = await supabase
      .from('experience')
      .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, program')
      .eq('active', true)
      .limit(5);
    
    if (experiences && experiences.length > 0) {
      product = experiences.find(p => 
        (Array.isArray(p.included_items) && p.included_items.length > 0) ||
        (Array.isArray(p.excluded_items) && p.excluded_items.length > 0) ||
        p.program
      ) || experiences[0];
      if (product) product.type = 'experience';
    }
  }
  
  // Se ancora non trovato, usa dati di test
  if (!product) {
    console.log('⚠️  Nessun prodotto trovato nel DB, uso dati di test');
    product = {
      id: 'test-product',
      name: 'Test Viaggio con Cane',
      description: 'Un viaggio di test per verificare il rendering dell\'email',
      included_items: ['Pernottamento in hotel pet-friendly', 'Colazione inclusa', 'Guida turistica', 'Trasporto'],
      excluded_items: ['Pranzo e cena', 'Bevande', 'Assicurazione viaggio'],
      meeting_info: {
        text: 'Il punto di incontro è presso la stazione centrale alle 9:00',
        google_maps_link: 'https://maps.google.com/?q=stazione+centrale'
      },
      show_meeting_info: true,
      cancellation_policy: 'Cancellazione gratuita fino a 48 ore prima della partenza',
      program: {
        days: [
          {
            day_number: 1,
            introduction: 'Giornata di arrivo e accoglienza',
            items: [
              { activity_text: 'Arrivo e check-in hotel', order_index: 1 },
              { activity_text: 'Passeggiata nel centro storico', order_index: 2 },
              { activity_text: 'Cena di benvenuto', order_index: 3 }
            ]
          },
          {
            day_number: 2,
            introduction: 'Escursione nella natura',
            items: [
              { activity_text: 'Colazione e partenza per escursione', order_index: 1 },
              { activity_text: 'Pranzo al sacco in montagna', order_index: 2 },
              { activity_text: 'Rientro in hotel', order_index: 3 }
            ]
          }
        ]
      },
      type: 'trip'
    };
  }
  
  console.log(`📦 Prodotto selezionato: ${product.name}`);
  console.log(`   ID: ${product.id}`);
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : [];
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : [];
  const program = product.program;
  
  console.log(`   Included items: ${includedItems.length}`);
  console.log(`   Excluded items: ${excludedItems.length}`);
  console.log(`   Program: ${program ? 'Presente' : 'Assente'}`);
  console.log(`   Cancellation Policy: ${product.cancellation_policy ? 'Presente' : 'Assente'}`);
  if (product.cancellation_policy) {
    console.log(`      "${product.cancellation_policy.substring(0, 50)}${product.cancellation_policy.length > 50 ? '...' : ''}"`);
  }
  console.log('');
  
  // Costruisci il payload email completo
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-cecilia-${Date.now()}`,
    customerEmail: 'ceciliacaprioli9@gmail.com',
    customerName: 'Cecilia',
    customerSurname: 'Caprioli',
    productName: product.name,
    productDescription: product.description || undefined,
    productType: product.type || 'trip',
    bookingDate: '2025-12-30',
    bookingTime: '10:00 - 12:00',
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 150.00,
    currency: 'EUR',
    orderNumber: `TEST${Date.now().toString().slice(-6)}`,
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
    program: program || undefined,
    cancellationPolicy: product.cancellation_policy || undefined,
  };
  
  console.log('📤 Invio email a ceciliacaprioli9@gmail.com...');
  console.log(`   Included items: ${includedItems.length > 0 ? `${includedItems.length} items` : 'Nessuno'}`);
  console.log(`   Excluded items: ${excludedItems.length > 0 ? `${excludedItems.length} items` : 'Nessuno'}`);
  console.log(`   Program: ${program ? 'Presente' : 'Assente'}`);
  console.log(`   Cancellation Policy: ${emailPayload.cancellationPolicy ? 'Presente' : 'Assente'}`);
  console.log('');
  
  try {
    // Chiama la funzione send-transactional-email
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailPayload,
    });
    
    if (error) {
      console.error('❌ Errore:', error);
      return;
    }
    
    console.log('✅ Email inviata con successo!');
    console.log('');
    console.log('📊 Dettagli invio:');
    console.log(`   Recipient: ceciliacaprioli9@gmail.com`);
    console.log(`   Product: ${product.name}`);
    console.log(`   Included items HTML length: ${data?.params?.INCLUDED_ITEMS_LENGTH || 0}`);
    console.log(`   Excluded items HTML length: ${data?.params?.EXCLUDED_ITEMS_LENGTH || 0}`);
    console.log(`   Included items display: ${data?.params?.INCLUDED_ITEMS_DISPLAY || 'none'}`);
    console.log(`   Excluded items display: ${data?.params?.EXCLUDED_ITEMS_DISPLAY || 'none'}`);
    console.log(`   Cancellation Policy: ${emailPayload.cancellationPolicy ? 'Inviata' : 'Non inviata'}`);
    console.log(`   Cancellation Policy length: ${emailPayload.cancellationPolicy?.length || 0}`);
    console.log('');
    console.log('✅ Verifica la casella email ceciliacaprioli9@gmail.com');
    console.log('   Controlla che:');
    console.log('   - Le liste di included/excluded items siano renderizzate correttamente (non raw HTML)');
    console.log('   - Il programma sia visibile e formattato correttamente');
    console.log('');
  } catch (err) {
    console.error('❌ Errore durante invio:', err);
  }
}

// Esegui il test
sendTestEmail().catch(console.error);

