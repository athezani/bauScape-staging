/**
 * Test completo per verificare che il fix delle email funzioni correttamente
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Dettagli:`, JSON.stringify(details, null, 2));
  }
}

async function test1_ColumnExists(): Promise<void> {
  console.log('\n📋 Test 1: Verifica esistenza colonna confirmation_email_sent');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?select=id,confirmation_email_sent&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      logTest('Test 1', true, 'Colonna confirmation_email_sent esiste');
    } else {
      const error = await response.json();
      if (error.code === '42703') {
        logTest('Test 1', false, 'Colonna confirmation_email_sent NON esiste - migration non eseguita');
      } else {
        logTest('Test 1', false, `Errore: ${error.message || response.statusText}`, error);
      }
    }
  } catch (error) {
    logTest('Test 1', false, `Errore durante il test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function test2_FindBookingsWithoutEmail(): Promise<void> {
  console.log('\n📋 Test 2: Trova booking senza email inviata');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?select=id,stripe_checkout_session_id,customer_email,product_name,confirmation_email_sent&confirmation_email_sent=eq.false&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const bookings = await response.json();
      logTest('Test 2', true, `Trovati ${bookings.length} booking senza email inviata`, {
        count: bookings.length,
        sample: bookings.slice(0, 2).map((b: any) => ({
          id: b.id,
          email: b.customer_email,
          product: b.product_name,
        })),
      });
    } else {
      const error = await response.json();
      logTest('Test 2', false, `Errore: ${error.message || response.statusText}`, error);
    }
  } catch (error) {
    logTest('Test 2', false, `Errore durante il test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function test3_EnsureBookingFunction(): Promise<void> {
  console.log('\n📋 Test 3: Verifica funzione ensure-booking');
  
  try {
    // Trova un booking esistente per testare
    const findResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?select=id,stripe_checkout_session_id,confirmation_email_sent&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!findResponse.ok) {
      logTest('Test 3', false, 'Impossibile trovare booking per test');
      return;
    }

    const bookings = await findResponse.json();
    if (bookings.length === 0) {
      logTest('Test 3', false, 'Nessun booking trovato nel database');
      return;
    }

    const testBooking = bookings[0];
    if (!testBooking.stripe_checkout_session_id) {
      logTest('Test 3', false, 'Booking senza stripe_checkout_session_id');
      return;
    }

    // Chiama ensure-booking
    const ensureResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/ensure-booking`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: testBooking.stripe_checkout_session_id,
          paymentGateway: 'stripe',
        }),
      }
    );

    if (ensureResponse.ok) {
      const result = await ensureResponse.json();
      logTest('Test 3', true, 'Funzione ensure-booking risponde correttamente', {
        success: result.success,
        alreadyExisted: result.alreadyExisted,
        bookingId: result.bookingId,
      });
    } else {
      const errorText = await ensureResponse.text();
      logTest('Test 3', false, `Errore nella funzione: ${errorText}`);
    }
  } catch (error) {
    logTest('Test 3', false, `Errore durante il test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function test4_EmailSendingForExistingBooking(): Promise<void> {
  console.log('\n📋 Test 4: Verifica invio email per booking esistente senza email');
  
  try {
    // Trova un booking senza email inviata
    const findResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?select=id,stripe_checkout_session_id,customer_email,confirmation_email_sent&confirmation_email_sent=eq.false&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!findResponse.ok) {
      logTest('Test 4', false, 'Impossibile trovare booking senza email');
      return;
    }

    const bookings = await findResponse.json();
    if (bookings.length === 0) {
      logTest('Test 4', true, 'Nessun booking senza email - tutti hanno ricevuto email (ottimo!)');
      return;
    }

    const testBooking = bookings[0];
    if (!testBooking.stripe_checkout_session_id) {
      logTest('Test 4', false, 'Booking senza stripe_checkout_session_id');
      return;
    }

    // Chiama ensure-booking per inviare email
    const ensureResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/ensure-booking`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: testBooking.stripe_checkout_session_id,
          paymentGateway: 'stripe',
        }),
      }
    );

    if (ensureResponse.ok) {
      // Aspetta un po' per permettere l'invio email
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verifica che confirmation_email_sent sia stato aggiornato
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/booking?id=eq.${testBooking.id}&select=confirmation_email_sent`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (checkResponse.ok) {
        const updated = await checkResponse.json();
        const emailSent = updated[0]?.confirmation_email_sent;
        
        if (emailSent) {
          logTest('Test 4', true, 'Email inviata con successo per booking esistente', {
            bookingId: testBooking.id,
            customerEmail: testBooking.customer_email,
          });
        } else {
          logTest('Test 4', false, 'Email non inviata - confirmation_email_sent ancora false', {
            bookingId: testBooking.id,
          });
        }
      } else {
        logTest('Test 4', false, 'Impossibile verificare stato email');
      }
    } else {
      const errorText = await ensureResponse.text();
      logTest('Test 4', false, `Errore nella funzione: ${errorText}`);
    }
  } catch (error) {
    logTest('Test 4', false, `Errore durante il test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function test5_SendTransactionalEmailFunction(): Promise<void> {
  console.log('\n📋 Test 5: Verifica funzione send-transactional-email');
  
  try {
    // Trova un booking per testare
    const findResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?select=id,customer_email,product_name,product_type,booking_date,number_of_adults,number_of_dogs,total_amount_paid,currency,stripe_checkout_session_id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!findResponse.ok) {
      logTest('Test 5', false, 'Impossibile trovare booking per test');
      return;
    }

    const bookings = await findResponse.json();
    if (bookings.length === 0) {
      logTest('Test 5', false, 'Nessun booking trovato');
      return;
    }

    const testBooking = bookings[0];

    // Chiama send-transactional-email direttamente
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
          bookingId: testBooking.id,
          customerEmail: testBooking.customer_email,
          customerName: 'Test',
          productName: testBooking.product_name,
          productType: testBooking.product_type,
          bookingDate: testBooking.booking_date,
          numberOfAdults: testBooking.number_of_adults || 1,
          numberOfDogs: testBooking.number_of_dogs || 0,
          totalAmount: testBooking.total_amount_paid,
          currency: testBooking.currency || 'EUR',
          orderNumber: testBooking.stripe_checkout_session_id?.slice(-8).toUpperCase() || 'TEST',
        }),
      }
    );

    if (emailResponse.ok) {
      const result = await emailResponse.json();
      logTest('Test 5', true, 'Funzione send-transactional-email funziona', {
        success: result.success,
        bookingId: result.bookingId,
      });
    } else {
      const errorText = await emailResponse.text();
      logTest('Test 5', false, `Errore nella funzione: ${errorText}`);
    }
  } catch (error) {
    logTest('Test 5', false, `Errore durante il test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('🧪 TEST COMPLETO: Fix Email di Conferma');
  console.log('=====================================\n');

  await test1_ColumnExists();
  await test2_FindBookingsWithoutEmail();
  await test3_EnsureBookingFunction();
  await test4_EmailSendingForExistingBooking();
  await test5_SendTransactionalEmailFunction();

  // Riepilogo
  console.log('\n📊 RIEPILOGO TEST');
  console.log('==================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`✅ Test passati: ${passed}/${total}`);
  console.log(`❌ Test falliti: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\n❌ Test falliti:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 Tutti i test sono passati! Il fix funziona correttamente.');
    process.exit(0);
  }
}

main();



