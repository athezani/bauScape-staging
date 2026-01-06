/**
 * Script per verificare che un booking sia stato creato correttamente
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY deve essere impostata');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyBooking(orderNumber) {
  console.log(`🔍 Verifica Booking #${orderNumber}`);
  console.log('='.repeat(60));
  console.log('');

  // 1. Cerca il booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (bookingError || !booking) {
    console.error(`❌ Booking non trovato: ${bookingError?.message || 'Nessun risultato'}`);
    return;
  }

  console.log('✅ Booking trovato!');
  console.log('');
  console.log('📋 Dettagli Booking:');
  console.log(`   ID: ${booking.id}`);
  console.log(`   Order Number: ${booking.order_number}`);
  console.log(`   Product Type: ${booking.product_type}`);
  console.log(`   Status: ${booking.status}`);
  console.log(`   Customer: ${booking.customer_name} ${booking.customer_surname || ''} (${booking.customer_email})`);
  console.log(`   Product: ${booking.product_name}`);
  console.log(`   Date: ${booking.booking_date} ${booking.booking_time ? new Date(booking.booking_time).toLocaleString() : ''}`);
  console.log(`   Adults: ${booking.number_of_adults}, Dogs: ${booking.number_of_dogs}`);
  console.log(`   Amount: ${booking.total_amount_paid} ${booking.currency || 'EUR'}`);
  console.log('');

  // 2. Verifica idempotency_key
  console.log('🔑 Verifica Idempotency Key:');
  if (booking.idempotency_key) {
    console.log(`   ✅ Idempotency Key: ${booking.idempotency_key}`);
  } else {
    console.log(`   ❌ Idempotency Key: NULL (PROBLEMA!)`);
  }
  console.log('');

  // 3. Verifica Stripe
  console.log('💳 Verifica Stripe:');
  if (booking.stripe_checkout_session_id) {
    console.log(`   ✅ Session ID: ${booking.stripe_checkout_session_id}`);
  } else {
    console.log(`   ⚠️  Session ID: NULL`);
  }
  if (booking.stripe_payment_intent_id) {
    console.log(`   ✅ Payment Intent: ${booking.stripe_payment_intent_id}`);
  } else {
    console.log(`   ⚠️  Payment Intent: NULL`);
  }
  console.log('');

  // 4. Verifica disponibilità (se c'è availability_slot_id)
  if (booking.availability_slot_id) {
    console.log('📅 Verifica Disponibilità:');
    const { data: slot, error: slotError } = await supabase
      .from('availability_slot')
      .select('*')
      .eq('id', booking.availability_slot_id)
      .single();

    if (slotError || !slot) {
      console.log(`   ⚠️  Slot non trovato: ${slotError?.message}`);
    } else {
      console.log(`   ✅ Slot ID: ${slot.id}`);
      console.log(`   📊 Capacità: ${slot.max_adults} adults, ${slot.max_dogs} dogs`);
      console.log(`   📊 Prenotati: ${slot.booked_adults} adults, ${slot.booked_dogs} dogs`);
      console.log(`   📊 Disponibili: ${slot.max_adults - slot.booked_adults} adults, ${slot.max_dogs - slot.booked_dogs} dogs`);
      
      // Verifica che i numeri siano coerenti
      const expectedAdults = slot.booked_adults;
      const expectedDogs = slot.booked_dogs;
      if (expectedAdults >= booking.number_of_adults && expectedDogs >= booking.number_of_dogs) {
        console.log(`   ✅ Disponibilità decrementata correttamente`);
      } else {
        console.log(`   ⚠️  Possibile problema con disponibilità`);
      }
    }
    console.log('');
  }

  // 5. Verifica eventi (booking_events)
  console.log('📨 Verifica Eventi:');
  const { data: events, error: eventsError } = await supabase
    .from('booking_events')
    .select('*')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false });

  if (eventsError) {
    console.log(`   ⚠️  Errore nel recupero eventi: ${eventsError.message}`);
  } else if (!events || events.length === 0) {
    console.log(`   ⚠️  Nessun evento trovato (dovrebbe esserci almeno 'booking_created')`);
  } else {
    console.log(`   ✅ Trovati ${events.length} evento/i:`);
    events.forEach((event, index) => {
      console.log(`      ${index + 1}. ${event.event_type} - Status: ${event.status} - Created: ${new Date(event.created_at).toLocaleString()}`);
    });
  }
  console.log('');

  // 6. Riepilogo finale
  console.log('='.repeat(60));
  console.log('📊 Riepilogo Verifica:');
  console.log('');

  const checks = {
    'Booking creato': !!booking,
    'Idempotency Key presente': !!booking.idempotency_key,
    'Stripe Session presente': !!booking.stripe_checkout_session_id,
    'Status corretto': booking.status === 'confirmed',
    'Eventi creati': events && events.length > 0,
  };

  let allOk = true;
  Object.entries(checks).forEach(([check, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${check}`);
    if (!passed) allOk = false;
  });

  console.log('');
  if (allOk) {
    console.log('🎉 Tutto OK! Il booking è stato creato correttamente.');
  } else {
    console.log('⚠️  Alcuni controlli non sono passati. Verifica i dettagli sopra.');
  }
}

const orderNumber = process.argv[2] || 'SHMDJSNB';
verifyBooking(orderNumber).catch(console.error);




