/**
 * Script per inviare email mancanti per booking esistenti
 * 
 * Questo script trova tutti i booking con confirmation_email_sent = false
 * e chiama ensure-booking per inviare le email mancanti
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

interface Booking {
  id: string;
  stripe_checkout_session_id: string;
  customer_email: string;
  product_name: string;
  confirmation_email_sent: boolean;
}

async function findBookingsWithoutEmail(): Promise<Booking[]> {
  // Use Supabase REST API with proper query format
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?select=id,stripe_checkout_session_id,customer_email,product_name,confirmation_email_sent&confirmation_email_sent=eq.false&limit=100`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

async function triggerEmailForBooking(sessionId: string | null, booking: Booking): Promise<boolean> {
  // Se non c'è sessionId, invia direttamente l'email
  if (!sessionId) {
    console.log(`   ⚠️  Booking senza session ID, invio email diretto...`);
    return await sendEmailDirectly(booking);
  }

  // Usa ensure-booking se c'è sessionId
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ensure-booking`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        paymentGateway: 'stripe',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to trigger email for session ${sessionId}:`, errorText);
    return false;
  }

  const result = await response.json();
  return result.success === true;
}

async function sendEmailDirectly(booking: Booking): Promise<boolean> {
  // Fetch full booking data
  const bookingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?id=eq.${booking.id}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!bookingResponse.ok) {
    return false;
  }

  const [fullBooking] = await bookingResponse.json();
  if (!fullBooking) {
    return false;
  }

  // Call send-transactional-email directly
  const emailResponse = await fetch(
    `${SUPABASE_URL}/functions/v1/send-transactional-email`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'order_confirmation',
        bookingId: fullBooking.id,
        customerEmail: fullBooking.customer_email,
        customerName: fullBooking.customer_name || 'Cliente',
        customerSurname: fullBooking.customer_surname || undefined,
        customerPhone: fullBooking.customer_phone || undefined,
        productName: fullBooking.product_name,
        productDescription: fullBooking.product_description || undefined,
        productType: fullBooking.product_type,
        bookingDate: fullBooking.booking_date,
        bookingTime: undefined, // Will be loaded from slot if available
        numberOfAdults: fullBooking.number_of_adults || 1,
        numberOfDogs: fullBooking.number_of_dogs || 0,
        totalAmount: fullBooking.total_amount_paid,
        currency: fullBooking.currency || 'EUR',
        orderNumber: fullBooking.order_number || fullBooking.id.slice(-8).toUpperCase(),
        noAdults: false, // Default, will be checked if needed
      }),
    }
  );

  if (emailResponse.ok) {
    // Mark as sent
    await fetch(
      `${SUPABASE_URL}/rest/v1/booking?id=eq.${booking.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ confirmation_email_sent: true }),
      }
    );
    return true;
  }

  return false;
}

async function main() {
  console.log('🔍 Cercando booking senza email inviata...');
  
  try {
    const bookings = await findBookingsWithoutEmail();
    
    if (bookings.length === 0) {
      console.log('✅ Nessun booking trovato senza email inviata');
      return;
    }

    console.log(`📧 Trovati ${bookings.length} booking senza email inviata`);
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const booking of bookings) {
      console.log(`📨 Invio email per booking ${booking.id} (${booking.product_name})...`);
      console.log(`   Cliente: ${booking.customer_email}`);
      console.log(`   Session: ${booking.stripe_checkout_session_id || 'N/A (invio diretto)'}`);
      
      const success = await triggerEmailForBooking(booking.stripe_checkout_session_id, booking);
      
      if (success) {
        console.log(`   ✅ Email inviata con successo`);
        successCount++;
      } else {
        console.log(`   ❌ Errore nell'invio email`);
        failCount++;
      }
      
      console.log('');
      
      // Piccola pausa per non sovraccaricare il sistema
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('📊 Riepilogo:');
    console.log(`   ✅ Email inviate con successo: ${successCount}`);
    console.log(`   ❌ Errori: ${failCount}`);
    console.log(`   📧 Totale booking processati: ${bookings.length}`);
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione:', error);
    process.exit(1);
  }
}

main();

