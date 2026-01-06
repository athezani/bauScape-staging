/**
 * Script per diagnosticare e fixare il booking #AFHTWQCB
 * 
 * Questo script:
 * 1. Cerca il booking con order_number = 'AFHTWQCB'
 * 2. Verifica se l'email è stata inviata
 * 3. Verifica se l'ordine Odoo è stato creato
 * 4. Fixa i problemi trovati
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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
}

async function findBooking(): Promise<Booking | null> {
  console.log(`\n🔍 Cercando booking con order_number = '${ORDER_NUMBER}'...\n`);
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?order_number=eq.${ORDER_NUMBER}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query booking: ${response.status} - ${errorText}`);
  }

  const bookings: Booking[] = await response.json();
  
  if (bookings.length === 0) {
    console.log('❌ Nessun booking trovato con questo order number.');
    console.log('\n🔍 Cercando per session ID che termina con questo order number...\n');
    
    // Try to find by session ID ending
    const response2 = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=ilike.%${ORDER_NUMBER}%&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response2.ok) {
      const bookings2: Booking[] = await response2.json();
      if (bookings2.length > 0) {
        console.log('✅ Trovato booking per session ID!');
        return bookings2[0];
      }
    }
    
    return null;
  }

  console.log('✅ Booking trovato!');
  return bookings[0];
}

async function checkEmailStatus(booking: Booking): Promise<boolean> {
  console.log(`\n📧 Verificando stato email per booking ${booking.id}...\n`);
  console.log(`   Email inviata: ${booking.confirmation_email_sent ? '✅ SÌ' : '❌ NO'}`);
  console.log(`   Customer email: ${booking.customer_email}`);
  
  return booking.confirmation_email_sent;
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

async function checkOdooOrder(paymentIntentId: string | null): Promise<boolean> {
  if (!paymentIntentId) {
    console.log('\n⚠️ Nessun payment_intent_id disponibile per verificare ordine Odoo');
    return false;
  }
  
  console.log(`\n🔍 Verificando ordine Odoo per payment_intent_id: ${paymentIntentId}...\n`);
  console.log('⚠️ Nota: La verifica diretta in Odoo richiede accesso al database Odoo.');
  console.log('   Controlla manualmente in Odoo cercando per client_order_ref =', paymentIntentId);
  
  // Non possiamo verificare direttamente senza accesso a Odoo
  // Ma possiamo suggerire di controllare manualmente
  return false;
}

async function createOdooOrder(booking: Booking): Promise<boolean> {
  if (!booking.stripe_payment_intent_id) {
    console.log('\n❌ Nessun payment_intent_id disponibile per creare ordine Odoo');
    return false;
  }
  
  console.log(`\n📦 Creazione ordine Odoo per payment_intent_id: ${booking.stripe_payment_intent_id}...\n`);
  console.log('⚠️ Nota: La creazione ordine Odoo richiede il webhook Vercel.');
  console.log('   Il webhook Vercel deve essere chiamato manualmente o configurato in Stripe.');
  console.log('   Endpoint: https://bauscape.vercel.app/api/stripe-webhook-odoo');
  
  // Non possiamo creare direttamente l'ordine Odoo da qui
  // Dobbiamo chiamare il webhook Vercel o suggerire di farlo manualmente
  return false;
}

async function main() {
  console.log('========================================');
  console.log('🔧 Fix Booking #AFHTWQCB');
  console.log('========================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY non impostata!');
    console.error('   Imposta la variabile d\'ambiente: export SUPABASE_SERVICE_ROLE_KEY=...');
    Deno.exit(1);
  }
  
  // Step 1: Find booking
  const booking = await findBooking();
  
  if (!booking) {
    console.error('\n❌ Booking non trovato!');
    console.error('   Verifica che l\'order number sia corretto o che il booking esista.');
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
  
  // Step 2: Check email status
  const emailSent = await checkEmailStatus(booking);
  
  // Step 3: Fix email if needed
  if (!emailSent) {
    console.log('\n🔧 Fixing email...');
    const emailFixed = await sendConfirmationEmail(booking);
    if (emailFixed) {
      console.log('✅ Email fixata con successo!');
    } else {
      console.error('❌ Fix email fallito!');
    }
  } else {
    console.log('\n✅ Email già inviata, nessun fix necessario.');
  }
  
  // Step 4: Check Odoo order
  const odooOrderExists = await checkOdooOrder(booking.stripe_payment_intent_id);
  
  // Step 5: Create Odoo order if needed
  if (!odooOrderExists) {
    console.log('\n🔧 Creazione ordine Odoo necessaria...');
    console.log('⚠️ Per creare l\'ordine Odoo, devi:');
    console.log('   1. Verificare che il webhook Vercel sia configurato in Stripe');
    console.log('   2. Chiamare manualmente il webhook o attendere che Stripe lo chiami');
    console.log('   3. Endpoint: https://bauscape.vercel.app/api/stripe-webhook-odoo');
    console.log('   4. Evento richiesto: payment_intent.succeeded');
    
    // Potremmo provare a chiamare il webhook manualmente, ma richiede il secret
    // Per ora, suggeriamo di farlo manualmente
  } else {
    console.log('\n✅ Ordine Odoo già esistente.');
  }
  
  console.log('\n========================================');
  console.log('✅ Diagnostica completata!');
  console.log('========================================\n');
}

if (import.meta.main) {
  main().catch(console.error);
}

