/**
 * Script per inviare una email di test a ceciliacaprioli9@gmail.com
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
  console.log('📧 INVIO EMAIL DI TEST A CECILIA\n');
  console.log('=' .repeat(60));
  
  // Trova un prodotto con included/excluded items
  const { data: product } = await supabase
    .from('trip')
    .select('id, name, description, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .ilike('name', '%TEST EMAIL%')
    .eq('active', true)
    .limit(1)
    .single();
  
  if (!product) {
    console.error('❌ Nessun prodotto TEST trovato!');
    return;
  }
  
  console.log(`📦 Prodotto: ${product.name}`);
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : [];
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : [];
  
  console.log(`   Included items: ${includedItems.length}`);
  console.log(`   Excluded items: ${excludedItems.length}`);
  console.log(`   Meeting info: ${product.meeting_info ? 'Presente' : 'Assente'}`);
  console.log(`   Cancellation policy: ${product.cancellation_policy ? 'Presente' : 'Assente'}`);
  
  // Costruisci il payload email
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-cecilia-${Date.now()}`,
    customerEmail: 'ceciliacaprioli9@gmail.com',
    customerName: 'Cecilia',
    customerSurname: 'Caprioli',
    productName: product.name,
    productDescription: product.description || undefined,
    productType: 'trip',
    bookingDate: '2025-12-27',
    bookingTime: '10:00 - 12:00',
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 100,
    currency: 'EUR',
    orderNumber: 'TEST001',
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
  
  console.log(`\n📤 Invio email a ceciliacaprioli9@gmail.com...`);
  
  try {
    // Chiama la funzione send-transactional-email
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailPayload,
    });
    
    if (error) {
      console.error(`❌ Errore:`, error);
      return;
    }
    
    // Verifica la risposta
    const response = data as any;
    console.log(`✅ Email inviata con successo!`);
    
    const includedItemsLength = response.params?.INCLUDED_ITEMS_LENGTH || 0;
    const excludedItemsLength = response.params?.EXCLUDED_ITEMS_LENGTH || 0;
    const includedItemsDisplay = response.params?.INCLUDED_ITEMS_DISPLAY || 'none';
    const excludedItemsDisplay = response.params?.EXCLUDED_ITEMS_DISPLAY || 'none';
    
    console.log(`\n📊 Parametri inviati a Brevo:`);
    console.log(`   INCLUDED_ITEMS: ${includedItemsLength} caratteri, Display: ${includedItemsDisplay}`);
    console.log(`   EXCLUDED_ITEMS: ${excludedItemsLength} caratteri, Display: ${excludedItemsDisplay}`);
    console.log(`   MEETING_INFO_DISPLAY: ${response.params?.MEETING_INFO_DISPLAY || 'none'}`);
    console.log(`   PROGRAM_DISPLAY: ${response.params?.PROGRAM_DISPLAY || 'none'}`);
    console.log(`   CANCELLATION_POLICY_DISPLAY: ${response.params?.CANCELLATION_POLICY_DISPLAY || 'none'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL INVIATA CON SUCCESSO!');
    console.log('='.repeat(60));
    console.log('\n💡 Verifica la casella email ceciliacaprioli9@gmail.com');
    console.log('   per confermare che:');
    console.log('   - Le sezioni "Cosa è incluso" e "Cosa non è incluso" appaiano correttamente');
    console.log('   - I checkmark siano verdi per "Cosa è incluso"');
    console.log('   - Le X siano rosse per "Cosa non è incluso"');
    console.log('   - L\'HTML sia renderizzato correttamente (non mostrato come testo)');
    console.log('   - La sezione "Orario e Punto di Incontro" appaia se presente');
    console.log('   - La sezione "Programma" appaia se presente');
    console.log('   - La sezione "Policy di Cancellazione" appaia se presente');
  } catch (err) {
    console.error(`❌ Errore durante invio:`, err);
  }
}

// Esegui l'invio
sendTestEmail().catch(console.error);

