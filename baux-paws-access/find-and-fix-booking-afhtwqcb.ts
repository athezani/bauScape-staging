/**
 * Script completo per trovare e fixare il booking #AFHTWQCB
 * 
 * Questo script:
 * 1. Cerca il booking in Supabase (per order_number e session_id)
 * 2. Se non trovato, cerca in Stripe per trovare la sessione
 * 3. Crea il booking se mancante
 * 4. Invia l'email se non inviata
 * 5. Verifica/crea ordine Odoo
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const ORDER_NUMBER = 'AFHTWQCB';

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
  number_of_adults: number;
  number_of_dogs: number;
  availability_slot_id?: string | null;
  product_description?: string | null;
  customer_phone?: string | null;
}

async function findBookingInSupabase(): Promise<Booking | null> {
  console.log(`\n🔍 Cercando booking in Supabase con order_number = '${ORDER_NUMBER}'...\n`);
  
  // Try by order_number
  let response = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?order_number=eq.${ORDER_NUMBER}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.ok) {
    const bookings: Booking[] = await response.json();
    if (bookings.length > 0) {
      console.log('✅ Booking trovato per order_number!');
      return bookings[0];
    }
  }
  
  // Try by session ID ending
  console.log('🔍 Cercando per session ID che termina con questo order number...\n');
  response = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=ilike.%${ORDER_NUMBER}%&select=*&limit=10`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (response.ok) {
    const bookings: Booking[] = await response.json();
    for (const booking of bookings) {
      if (booking.stripe_checkout_session_id && 
          booking.stripe_checkout_session_id.toUpperCase().endsWith(ORDER_NUMBER)) {
        console.log('✅ Booking trovato per session ID!');
        return booking;
      }
    }
  }
  
  return null;
}

async function findSessionInStripe(): Promise<string | null> {
  if (!STRIPE_SECRET_KEY) {
    console.log('⚠️ STRIPE_SECRET_KEY non disponibile, impossibile cercare in Stripe');
    return null;
  }
  
  console.log(`\n🔍 Cercando sessione Stripe che termina con '${ORDER_NUMBER}'...\n`);
  
  try {
    // Search recent checkout sessions
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=100', {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore nella ricerca Stripe:', errorText);
      return null;
    }
    
    const data = await response.json();
    
    for (const session of data.data || []) {
      if (session.id && session.id.toUpperCase().endsWith(ORDER_NUMBER)) {
        console.log('✅ Sessione Stripe trovata!');
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Payment Intent: ${session.payment_intent || 'N/A'}`);
        console.log(`   Customer Email: ${session.customer_email || session.customer_details?.email || 'N/A'}`);
        return session.id;
      }
    }
    
    console.log('❌ Nessuna sessione Stripe trovata con questo order number');
    return null;
  } catch (error) {
    console.error('❌ Errore durante ricerca in Stripe:', error);
    return null;
  }
}

async function createBookingFromSession(sessionId: string): Promise<Booking | null> {
  console.log(`\n🔧 Creando booking da sessione Stripe: ${sessionId}...\n`);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ensure-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({
          sessionId,
          paymentGateway: 'stripe',
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore nella creazione booking:', errorText);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ Booking creato/verificato!');
    console.log(`   Booking ID: ${result.bookingId}`);
    console.log(`   Already Existed: ${result.alreadyExisted}`);
    
    // Fetch the created booking
    const bookingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?id=eq.${result.bookingId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (bookingResponse.ok) {
      const bookings: Booking[] = await bookingResponse.json();
      if (bookings.length > 0) {
        return bookings[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Errore durante creazione booking:', error);
    return null;
  }
}

async function sendConfirmationEmail(booking: Booking): Promise<boolean> {
  console.log(`\n📧 Invio email di conferma per booking ${booking.id}...\n`);
  
  try {
    // Load activity time range from availability slot if available
    let activityTimeRange: string | null = null;
    if (booking.availability_slot_id) {
      const slotResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/availability_slot?id=eq.${booking.availability_slot_id}&select=time_slot,end_time,product_id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (slotResponse.ok) {
        const slots = await slotResponse.json();
        if (slots.length > 0 && slots[0].time_slot) {
          const formatTime = (timeStr: string | null): string => {
            if (!timeStr) return '';
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
              return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
            return timeStr;
          };
          
          const startTime = formatTime(slots[0].time_slot);
          const endTime = formatTime(slots[0].end_time);
          
          if (endTime) {
            activityTimeRange = `${startTime} - ${endTime}`;
          } else {
            activityTimeRange = startTime;
          }
        }
      }
    }
    
    // Get product to check no_adults flag
    const tableName = booking.product_type === 'class' ? 'class' : booking.product_type === 'experience' ? 'experience' : 'trip';
    let productNoAdults = false;
    
    if (booking.product_type !== 'trip' && booking.availability_slot_id) {
      const slotResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/availability_slot?id=eq.${booking.availability_slot_id}&select=product_id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (slotResponse.ok) {
        const slots = await slotResponse.json();
        if (slots.length > 0 && slots[0].product_id) {
          const productResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${slots[0].product_id}&select=no_adults`,
            {
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (productResponse.ok) {
            const products = await productResponse.json();
            if (products.length > 0) {
              productNoAdults = products[0].no_adults === true || products[0].no_adults === 1;
            }
          }
        }
      }
    }
    
    const formatOrderNumber = (sessionId: string | null): string => {
      if (!sessionId) return ORDER_NUMBER;
      return sessionId.slice(-8).toUpperCase();
    };
    
    const emailPayload = {
      type: 'order_confirmation',
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      customerSurname: booking.customer_surname || undefined,
      customerPhone: booking.customer_phone || undefined,
      productName: booking.product_name,
      productDescription: booking.product_description || undefined,
      productType: booking.product_type,
      bookingDate: booking.booking_date,
      bookingTime: activityTimeRange || undefined,
      numberOfAdults: booking.number_of_adults,
      numberOfDogs: booking.number_of_dogs,
      totalAmount: booking.total_amount_paid,
      currency: booking.currency,
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
      noAdults: productNoAdults,
    };
    
    const emailResponse = await fetch(
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
    
    if (emailResponse.ok) {
      // Mark as sent
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/booking?id=eq.${booking.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ confirmation_email_sent: true }),
        }
      );
      
      if (updateResponse.ok) {
        console.log('✅ Email inviata con successo!');
        return true;
      } else {
        console.error('⚠️ Email inviata ma aggiornamento stato fallito');
        return true;
      }
    } else {
      const errorText = await emailResponse.text();
      console.error('❌ Invio email fallito:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Errore durante invio email:', error);
    return false;
  }
}

async function checkOdooOrder(paymentIntentId: string | null): Promise<void> {
  if (!paymentIntentId) {
    console.log('\n⚠️ Nessun payment_intent_id disponibile per verificare ordine Odoo');
    return;
  }
  
  console.log(`\n🔍 Verifica ordine Odoo per payment_intent_id: ${paymentIntentId}...\n`);
  console.log('⚠️ Per verificare/creare l\'ordine Odoo:');
  console.log('   1. Verifica in Odoo cercando per client_order_ref =', paymentIntentId);
  console.log('   2. Se non esiste, il webhook Vercel deve essere chiamato');
  console.log('   3. Endpoint: https://bauscape.vercel.app/api/stripe-webhook-odoo');
  console.log('   4. Evento richiesto: payment_intent.succeeded');
  console.log('   5. Verifica che il webhook sia configurato in Stripe Dashboard');
}

async function main() {
  console.log('========================================');
  console.log('🔧 Find & Fix Booking #AFHTWQCB');
  console.log('========================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY non impostata!');
    console.error('   Imposta la variabile d\'ambiente: export SUPABASE_SERVICE_ROLE_KEY=...');
    Deno.exit(1);
  }
  
  // Step 1: Find booking in Supabase
  let booking = await findBookingInSupabase();
  
  // Step 2: If not found, try to find in Stripe
  if (!booking) {
    console.log('\n⚠️ Booking non trovato in Supabase, cercando in Stripe...\n');
    const sessionId = await findSessionInStripe();
    
    if (sessionId) {
      // Step 3: Create booking from Stripe session
      booking = await createBookingFromSession(sessionId);
    } else {
      console.error('\n❌ Nessuna sessione Stripe trovata!');
      console.error('   Verifica che l\'order number sia corretto.');
      Deno.exit(1);
    }
  }
  
  if (!booking) {
    console.error('\n❌ Impossibile trovare o creare il booking!');
    Deno.exit(1);
  }
  
  console.log('\n📋 Dettagli Booking:');
  console.log(`   ID: ${booking.id}`);
  console.log(`   Order Number: ${booking.order_number || 'N/A'}`);
  console.log(`   Session ID: ${booking.stripe_checkout_session_id || 'N/A'}`);
  console.log(`   Payment Intent ID: ${booking.stripe_payment_intent_id || 'N/A'}`);
  console.log(`   Customer: ${booking.customer_name} ${booking.customer_surname || ''} (${booking.customer_email})`);
  console.log(`   Product: ${booking.product_name} (${booking.product_type})`);
  console.log(`   Date: ${booking.booking_date}`);
  console.log(`   Amount: ${booking.total_amount_paid} ${booking.currency}`);
  console.log(`   Status: ${booking.status}`);
  console.log(`   Created: ${booking.created_at}`);
  
  // Step 4: Check and fix email
  console.log(`\n📧 Stato email: ${booking.confirmation_email_sent ? '✅ Inviata' : '❌ Non inviata'}`);
  
  if (!booking.confirmation_email_sent) {
    console.log('\n🔧 Invio email di conferma...');
    const emailSent = await sendConfirmationEmail(booking);
    if (emailSent) {
      console.log('✅ Email inviata con successo!');
    } else {
      console.error('❌ Invio email fallito!');
    }
  } else {
    console.log('\n✅ Email già inviata, nessun fix necessario.');
  }
  
  // Step 5: Check Odoo order
  await checkOdooOrder(booking.stripe_payment_intent_id);
  
  console.log('\n========================================');
  console.log('✅ Diagnostica completata!');
  console.log('========================================\n');
}

if (import.meta.main) {
  main().catch(console.error);
}

