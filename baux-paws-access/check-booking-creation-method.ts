/**
 * Script per verificare come è stato creato un booking
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const orderNumber = Deno.args[0] || 'QBFS1NX7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBookingCreation() {
  console.log('🔍 Verificando come è stato creato il booking #' + orderNumber + '...\n');

  // 1. Cerca booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select(`
      id,
      order_number,
      created_at,
      idempotency_key,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      provider_cost_total
    `)
    .eq('order_number', orderNumber)
    .single();

  if (bookingError || !booking) {
    console.error('❌ Booking non trovato:', bookingError);
    Deno.exit(1);
  }

  console.log('📋 Dettagli Booking:');
  console.log('  ID:', booking.id);
  console.log('  Order Number:', booking.order_number);
  console.log('  Created At:', booking.created_at);
  console.log('  Idempotency Key:', booking.idempotency_key || '❌ NULL (potrebbe indicare creazione diretta nel DB)');
  console.log('  Checkout Session ID:', booking.stripe_checkout_session_id || '❌ NULL');
  console.log('  Payment Intent ID:', booking.stripe_payment_intent_id || '❌ NULL');
  console.log('  Provider Cost Total:', booking.provider_cost_total);
  console.log('');

  // 2. Verifica se ci sono eventi associati
  const { data: events } = await supabase
    .from('booking_events')
    .select('id, event_type, status, created_at')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false });

  console.log('📊 Eventi associati:', events?.length || 0);
  if (events && events.length > 0) {
    events.forEach((event, idx) => {
      console.log(`  ${idx + 1}. ${event.event_type} - ${event.status} (${event.created_at})`);
    });
  } else {
    console.log('  ⚠️  Nessun evento trovato (potrebbe indicare che il booking non è stato creato tramite create-booking)');
  }
  console.log('');

  // 3. Analisi
  console.log('🔍 Analisi:');
  
  if (!booking.idempotency_key) {
    console.log('  ⚠️  Idempotency Key è NULL');
    console.log('     Questo potrebbe indicare che il booking è stato creato direttamente nel database');
    console.log('     o tramite un metodo che non usa la funzione create-booking');
  } else {
    console.log('  ✅ Idempotency Key presente (indica che è stato creato tramite create-booking)');
  }

  if (!booking.stripe_checkout_session_id) {
    console.log('  ⚠️  Checkout Session ID è NULL');
    console.log('     Questo potrebbe indicare che il booking non è stato creato tramite Stripe');
  } else {
    console.log('  ✅ Checkout Session ID presente');
  }

  if (events && events.length === 0) {
    console.log('  ⚠️  Nessun evento trovato');
    console.log('     Questo potrebbe indicare che il booking non è stato creato tramite create-booking');
    console.log('     (la funzione create-booking crea automaticamente un evento "created")');
  } else {
    console.log('  ✅ Eventi trovati (indica che è stato creato tramite create-booking)');
  }

  console.log('');
  console.log('💡 Conclusioni:');
  if (booking.idempotency_key && events && events.length > 0) {
    console.log('  ✅ Il booking è stato creato tramite la funzione create-booking');
    console.log('  ❓ Se il PO non è stato creato, potrebbe essere:');
    console.log('     1. Un errore silenzioso durante la creazione del PO');
    console.log('     2. Le variabili d\'ambiente Odoo non erano disponibili al momento della creazione');
    console.log('     3. La funzione create-booking non aveva ancora l\'integrazione PO al momento della creazione');
  } else {
    console.log('  ⚠️  Il booking potrebbe NON essere stato creato tramite la funzione create-booking');
    console.log('     In questo caso, il PO non verrebbe creato automaticamente');
    console.log('     Usa lo script create-po-for-booking.ts per creare il PO manualmente');
  }
}

checkBookingCreation().catch((error) => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});



