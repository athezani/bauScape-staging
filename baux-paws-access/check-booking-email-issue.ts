/**
 * Script per verificare perché l'email di conferma non è stata inviata per un booking
 * 
 * Usage: deno run --allow-net --allow-env check-booking-email-issue.ts UGYSLY3J
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface Booking {
  id: string;
  order_number: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_surname: string | null;
  confirmation_email_sent: boolean;
  status: string;
  created_at: string;
  product_name: string;
  product_type: string;
  total_amount_paid: number;
  currency: string;
  booking_date: string;
  booking_time: string | null;
  number_of_adults: number;
  number_of_dogs: number;
  availability_slot_id: string | null;
  provider_id: string | null;
}

const orderNumber = Deno.args[0] || 'UGYSLY3J';

async function checkBooking() {
  console.log('🔍 Verificando booking #' + orderNumber + '...\n');

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY non configurato');
    console.log('\nConfigura con:');
    console.log('export SUPABASE_SERVICE_ROLE_KEY=your_key');
    Deno.exit(1);
  }

  const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
    m.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  );

  // Cerca il booking per order_number
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (bookingError || !booking) {
    // Prova a cercare per session ID che termina con l'order number
    console.log('⚠️  Booking non trovato per order_number, cercando per session ID...\n');
    
    const { data: bookings, error: searchError } = await supabase
      .from('booking')
      .select('*')
      .ilike('stripe_checkout_session_id', `%${orderNumber}%`)
      .limit(10);

    if (searchError || !bookings || bookings.length === 0) {
      console.error('❌ Booking #' + orderNumber + ' non trovato');
      console.error('Errore:', bookingError || searchError);
      Deno.exit(1);
    }

    // Trova quello che termina esattamente con l'order number
    const foundBooking = bookings.find(b => 
      b.stripe_checkout_session_id?.toUpperCase().endsWith(orderNumber.toUpperCase())
    );

    if (!foundBooking) {
      console.error('❌ Booking #' + orderNumber + ' non trovato');
      console.log('\nBooking trovati con session ID simile:');
      bookings.forEach(b => {
        console.log(`  - ${b.order_number || 'N/A'} (${b.stripe_checkout_session_id?.slice(-8) || 'N/A'})`);
      });
      Deno.exit(1);
    }

    console.log('✅ Booking trovato per session ID!\n');
    displayBookingInfo(foundBooking as Booking);
    return foundBooking as Booking;
  }

  console.log('✅ Booking trovato!\n');
  displayBookingInfo(booking as Booking);
  return booking as Booking;
}

function displayBookingInfo(booking: Booking) {
  console.log('📋 Dettagli Booking:');
  console.log('  ID:', booking.id);
  console.log('  Order Number:', booking.order_number || 'N/A');
  console.log('  Session ID:', booking.stripe_checkout_session_id || 'N/A');
  console.log('  Payment Intent:', booking.stripe_payment_intent_id || 'N/A');
  console.log('  Status:', booking.status);
  console.log('  Created At:', booking.created_at);
  console.log('  Customer:', `${booking.customer_name} ${booking.customer_surname || ''}`.trim());
  console.log('  Email:', booking.customer_email);
  console.log('  Product:', booking.product_name);
  console.log('  Product Type:', booking.product_type);
  console.log('  Booking Date:', booking.booking_date);
  console.log('  Booking Time:', booking.booking_time || 'N/A');
  console.log('  Adults:', booking.number_of_adults);
  console.log('  Dogs:', booking.number_of_dogs);
  console.log('  Total:', booking.total_amount_paid, booking.currency);
  console.log('  Availability Slot ID:', booking.availability_slot_id || 'N/A');
  console.log('  Provider ID:', booking.provider_id || 'N/A');
  console.log('  📧 Email inviata:', booking.confirmation_email_sent ? '✅ SÌ' : '❌ NO');
  console.log('');
}

async function checkAvailabilitySlot(booking: Booking) {
  if (!booking.availability_slot_id) {
    console.log('⚠️  Nessun availability_slot_id associato al booking');
    return null;
  }

  console.log('🔍 Verificando availability slot...\n');

  const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
    m.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  );

  const { data: slot, error: slotError } = await supabase
    .from('availability_slot')
    .select('id, time_slot, end_time, date, available_capacity, booked_capacity')
    .eq('id', booking.availability_slot_id)
    .single();

  if (slotError) {
    console.error('❌ Errore nel recupero dello slot:', slotError);
    return null;
  }

  if (slot) {
    console.log('📅 Dettagli Slot:');
    console.log('  ID:', slot.id);
    console.log('  Date:', slot.date);
    console.log('  Time Slot:', slot.time_slot || 'N/A');
    console.log('  End Time:', slot.end_time || 'N/A');
    console.log('  Available Capacity:', slot.available_capacity);
    console.log('  Booked Capacity:', slot.booked_capacity);
    console.log('');
  }

  return slot;
}

async function analyzeEmailIssue(booking: Booking) {
  console.log('🔍 Analisi del problema email...\n');

  const issues: string[] = [];

  // Verifica 1: Email inviata?
  if (!booking.confirmation_email_sent) {
    issues.push('❌ confirmation_email_sent è FALSE - email non inviata');
  }

  // Verifica 2: Dati necessari presenti?
  if (!booking.customer_email) {
    issues.push('❌ customer_email mancante');
  }

  if (!booking.stripe_checkout_session_id) {
    issues.push('❌ stripe_checkout_session_id mancante');
  }

  if (!booking.availability_slot_id) {
    issues.push('⚠️  availability_slot_id mancante (potrebbe causare problemi con booking_time)');
  }

  // Verifica 3: Status del booking
  if (booking.status !== 'confirmed') {
    issues.push(`⚠️  Status non è 'confirmed': ${booking.status}`);
  }

  // Verifica 4: Provider ID
  if (!booking.provider_id) {
    issues.push('⚠️  provider_id mancante');
  }

  if (issues.length > 0) {
    console.log('🚨 Problemi identificati:');
    issues.forEach(issue => console.log('  ' + issue));
    console.log('');
  } else {
    console.log('✅ Tutti i dati necessari sono presenti');
    console.log('⚠️  Ma confirmation_email_sent è FALSE - potrebbe essere un errore durante l\'invio');
    console.log('');
  }

  return issues;
}

async function suggestFix(booking: Booking) {
  console.log('💡 Suggerimenti per risolvere il problema:\n');

  if (!booking.confirmation_email_sent) {
    console.log('1. Prova a inviare manualmente l\'email usando:');
    console.log(`   deno run --allow-net --allow-env fix-booking-email.ts ${booking.order_number || booking.id.slice(-8).toUpperCase()}`);
    console.log('');
    console.log('2. Verifica i log delle Edge Functions su Supabase Dashboard:');
    console.log('   - create-booking: cerca il bookingId o requestId');
    console.log('   - send-transactional-email: cerca il bookingId');
    console.log('   - stripe-webhook: cerca il session ID');
    console.log('');
    console.log('3. Verifica la configurazione Brevo:');
    console.log('   - BREVO_API_KEY configurato?');
    console.log('   - Template IDs corretti?');
    console.log('');
  }
}

async function main() {
  try {
    const booking = await checkBooking();
    await checkAvailabilitySlot(booking);
    await analyzeEmailIssue(booking);
    await suggestFix(booking);

    console.log('✅ Analisi completata');
  } catch (error) {
    console.error('❌ Errore:', error);
    Deno.exit(1);
  }
}

main();



