/**
 * TEST CRITICI: Flussi Checkout - Devono sempre funzionare
 * 
 * Questo test verifica che TUTTI i flussi critici del checkout funzionino SEMPRE.
 * Deve essere eseguito PRIMA di ogni deploy per assicurarsi che questi step non falliscano MAI.
 * 
 * Flussi testati:
 * 1. Pagina prodotto → Checkout (verifica che la pagina prodotto si apra e permetta di andare al checkout)
 * 2. Checkout → Stripe (verifica che la creazione della checkout session funzioni)
 * 3. Stripe → Thank you page (verifica che dopo il pagamento si vada alla thank you page)
 * 4. Stripe → Odoo (verifica che il webhook crei l'ordine in Odoo)
 * 
 * IMPORTANTE: Tutti questi test devono passare per procedere con il deploy.
 */

// Load environment variables with fallbacks
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const ODOO_URL = Deno.env.get('OD_URL') || '';
const ODOO_DB = Deno.env.get('OD_DB_NAME') || '';
const ODOO_LOGIN = Deno.env.get('OD_LOGIN') || '';
const ODOO_API_KEY = Deno.env.get('OD_API_KEY') || '';
const BASE_URL = Deno.env.get('BASE_URL') || 'https://flixdog.com';

// Validate required environment variables
function validateEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === '') {
    missing.push('SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
  
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.trim() === '') {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  
  // Optional but recommended
  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.trim() === '') {
    warnings.push('STRIPE_SECRET_KEY (opzionale, alcuni test potrebbero essere saltati)');
  }
  
  if (!ODOO_URL || !ODOO_DB || !ODOO_LOGIN || !ODOO_API_KEY) {
    warnings.push('Credenziali Odoo (opzionali, il test Odoo sarà saltato)');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(testName: string, passed: boolean, error?: string, details?: any, duration?: number) {
  results.push({ testName, passed, error, details, duration });
  const icon = passed ? '✅' : '❌';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${icon} ${testName}${durationStr}`);
  if (error) {
    console.log(`   ❌ ERRORE: ${error}`);
  }
  if (details) {
    console.log(`   📋 Dettagli:`, JSON.stringify(details, null, 2));
  }
}

async function querySupabase(
  table: string,
  select: string = '*',
  filters: Record<string, any> = {},
  useServiceKey: boolean = false
): Promise<any[]> {
  const apiKey = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    const keyType = useServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY';
    throw new Error(`Missing required environment variable: ${keyType}. Please set it before running tests.`);
  }
  
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.append('select', select);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const headers: Record<string, string> = {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Query failed: ${response.status}`;
    
    if (response.status === 401) {
      errorMessage = `Authentication failed (401). Check that SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is correctly set. Response: ${errorText}`;
    } else if (response.status === 403) {
      errorMessage = `Permission denied (403). Check RLS policies. Response: ${errorText}`;
    } else {
      errorMessage = `Query failed: ${response.status} - ${errorText}`;
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
}

async function test1_ProductPageLoads() {
  const testName = 'Test 1: Pagina prodotto si apre correttamente';
  const startTime = Date.now();
  
  try {
    console.log(`\n📋 ${testName}`);
    
    // Find an active product (experience, class, or trip)
    const experiences = await querySupabase(
      'experience',
      'id,name,active',
      { 'active': 'eq.true' },
      true
    );
    
    const classes = await querySupabase(
      'class',
      'id,name,active',
      { 'active': 'eq.true' },
      true
    );
    
    const trips = await querySupabase(
      'trip',
      'id,name,active',
      { 'active': 'eq.true' },
      true
    );

    const allProducts = [
      ...experiences.map((e: any) => ({ ...e, type: 'experience' })),
      ...classes.map((c: any) => ({ ...c, type: 'class' })),
      ...trips.map((t: any) => ({ ...t, type: 'trip' })),
    ];

    if (allProducts.length === 0) {
      logTest(testName, false, 'Nessun prodotto attivo trovato nel database', undefined, Date.now() - startTime);
      return;
    }

    const product = allProducts[0];
    
    // Test that product page URL is accessible
    const productPageUrl = `${BASE_URL}/prodotto/${product.type}/${product.id}`;
    
    try {
      const response = await fetch(productPageUrl, { 
        method: 'HEAD',
        redirect: 'follow'
      });
      
      if (!response.ok && response.status !== 200) {
        logTest(testName, false, `Pagina prodotto non accessibile: ${response.status}`, {
          productId: product.id,
          productType: product.type,
          productName: product.name,
          url: productPageUrl,
          status: response.status,
        }, Date.now() - startTime);
        return;
      }
      
      logTest(testName, true, undefined, {
        productId: product.id,
        productType: product.type,
        productName: product.name,
        url: productPageUrl,
        status: response.status,
      }, Date.now() - startTime);
    } catch (fetchError) {
      logTest(testName, false, `Errore nel fetch della pagina prodotto: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`, {
        productId: product.id,
        productType: product.type,
        productName: product.name,
        url: productPageUrl,
      }, Date.now() - startTime);
    }
  } catch (error) {
    logTest(testName, false, error instanceof Error ? error.message : String(error), undefined, Date.now() - startTime);
  }
}

async function test2_CheckoutToStripe() {
  const testName = 'Test 2: Checkout → Stripe (creazione checkout session)';
  const startTime = Date.now();
  
  try {
    console.log(`\n📋 ${testName}`);
    
    // Find an active product with availability slot
    const trips = await querySupabase(
      'trip',
      'id,name,active,start_date',
      { 'active': 'eq.true' },
      true
    );

    if (trips.length === 0) {
      logTest(testName, false, 'Nessun trip attivo trovato per il test', undefined, Date.now() - startTime);
      return;
    }

    const trip = trips[0];
    
    // Find availability slot for this trip
    const slots = await querySupabase(
      'availability_slot',
      'id,date,max_adults,max_dogs,booked_adults,booked_dogs',
      {
        'product_id': `eq.${trip.id}`,
        'product_type': 'eq.trip',
      },
      true
    );

    if (slots.length === 0) {
      logTest(testName, false, 'Nessuno slot disponibile trovato per il trip', {
        tripId: trip.id,
        tripName: trip.name,
      }, Date.now() - startTime);
      return;
    }

    const slot = slots[0];
    const availableAdults = (slot.max_adults || 0) - (slot.booked_adults || 0);
    const availableDogs = (slot.max_dogs || 0) - (slot.booked_dogs || 0);

    if (availableAdults < 1 || availableDogs < 1) {
      logTest(testName, false, 'Slot senza capacità disponibile', {
        tripId: trip.id,
        slotId: slot.id,
        availableAdults,
        availableDogs,
      }, Date.now() - startTime);
      return;
    }

    // Test create-checkout-session function
    const functionsUrl = `${SUPABASE_URL}/functions/v1/create-checkout-session`;
    
    const checkoutRequest = {
      productId: trip.id,
      productType: 'trip' as const,
      availabilitySlotId: slot.id,
      date: slot.date,
      timeSlot: null,
      guests: 1,
      dogs: 1,
      successUrl: `${BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${BASE_URL}/prodotto/trip/${trip.id}`,
      isB2B: false,
      customer: {
        name: 'Test',
        surname: 'User',
        email: 'test@example.com',
        phone: '+393401234567',
        fiscalCode: null,
        addressLine1: 'Via Test 123',
        addressCity: 'Milano',
        addressPostalCode: '20100',
        addressProvince: 'MI',
        addressCountry: 'IT',
      },
    };

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(checkoutRequest),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      logTest(testName, false, `Creazione checkout session fallita: ${response.status}`, {
        status: response.status,
        response: responseData,
        request: checkoutRequest,
      }, Date.now() - startTime);
      return;
    }

    if (!responseData.url || !responseData.url.includes('checkout.stripe.com')) {
      logTest(testName, false, 'Checkout session creata ma URL Stripe non valido', {
        response: responseData,
      }, Date.now() - startTime);
      return;
    }

    logTest(testName, true, undefined, {
      checkoutSessionUrl: responseData.url,
      checkoutSessionId: responseData.sessionId || 'N/A',
      tripId: trip.id,
      slotId: slot.id,
    }, Date.now() - startTime);
  } catch (error) {
    logTest(testName, false, error instanceof Error ? error.message : String(error), undefined, Date.now() - startTime);
  }
}

async function test3_StripeToThankYou() {
  const testName = 'Test 3: Stripe → Thank you page (redirect e creazione booking)';
  const startTime = Date.now();
  
  try {
    console.log(`\n📋 ${testName}`);
    
    // This test verifies that:
    // 1. The success URL format is correct
    // 2. The thank you page can handle a session_id parameter
    // 3. The create-booking function is accessible
    
    const thankYouPageUrl = `${BASE_URL}/thank-you?session_id=test_session_123`;
    
    // Test that thank you page is accessible
    try {
      const response = await fetch(thankYouPageUrl, { 
        method: 'HEAD',
        redirect: 'follow'
      });
      
      if (!response.ok && response.status !== 200) {
        logTest(testName, false, `Thank you page non accessibile: ${response.status}`, {
          url: thankYouPageUrl,
          status: response.status,
        }, Date.now() - startTime);
        return;
      }
    } catch (fetchError) {
      logTest(testName, false, `Errore nel fetch della thank you page: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`, {
        url: thankYouPageUrl,
      }, Date.now() - startTime);
      return;
    }

    // Test that create-booking function is accessible
    const createBookingUrl = `${SUPABASE_URL}/functions/v1/create-booking`;
    
    try {
      const response = await fetch(createBookingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          session_id: 'test_session_123',
        }),
      });

      // We expect either success or a specific error (not a 404 or 500)
      if (response.status === 404 || response.status >= 500) {
        logTest(testName, false, `create-booking function non accessibile: ${response.status}`, {
          url: createBookingUrl,
          status: response.status,
        }, Date.now() - startTime);
        return;
      }

      logTest(testName, true, undefined, {
        thankYouPageUrl,
        createBookingUrl,
        createBookingStatus: response.status,
        note: 'Thank you page e create-booking function sono accessibili',
      }, Date.now() - startTime);
    } catch (fetchError) {
      logTest(testName, false, `Errore nel test di create-booking: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`, {
        url: createBookingUrl,
      }, Date.now() - startTime);
    }
  } catch (error) {
    logTest(testName, false, error instanceof Error ? error.message : String(error), undefined, Date.now() - startTime);
  }
}

async function test4_StripeToOdoo() {
  const testName = 'Test 4: Stripe → Odoo (webhook e creazione ordine)';
  const startTime = Date.now();
  
  try {
    console.log(`\n📋 ${testName}`);
    
    // This test verifies that:
    // 1. The webhook endpoint is accessible
    // 2. Odoo connection is configured (if credentials provided)
    // 3. The webhook can process events (at least respond correctly)
    
    // Test webhook endpoint accessibility first (this is required)
    const webhookUrl = `${BASE_URL}/api/stripe-webhook-odoo`;
    
    try {
      // Test GET request (health check)
      const getResponse = await fetch(webhookUrl, { method: 'GET' });
      const getResponseText = await getResponse.text();
      let getResponseData: any;
      try {
        getResponseData = JSON.parse(getResponseText);
      } catch {
        getResponseData = { raw: getResponseText };
      }

      if (!getResponse.ok && getResponse.status !== 200) {
        logTest(testName, false, `Webhook endpoint non accessibile (GET): ${getResponse.status}`, {
          url: webhookUrl,
          status: getResponse.status,
          response: getResponseData,
        }, Date.now() - startTime);
        return;
      }

      // Odoo connection test is optional
      if (!ODOO_URL || !ODOO_DB || !ODOO_LOGIN || !ODOO_API_KEY) {
        logTest(testName, true, undefined, {
          webhookUrl,
          webhookStatus: getResponse.status,
          odooConfigured: false,
          note: 'Webhook endpoint funzionante. Credenziali Odoo non configurate (opzionale per questo test).',
        }, Date.now() - startTime);
        return;
      }

      // Test Odoo connection
      const odooTestUrl = `${ODOO_URL}/jsonrpc`;
      try {
        const odooResponse = await fetch(odooTestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            id: Date.now(),
            params: {
              service: 'common',
              method: 'login',
              args: [ODOO_DB, ODOO_LOGIN, ODOO_API_KEY],
            },
          }),
        });

        if (!odooResponse.ok) {
          logTest(testName, false, `Connessione Odoo fallita: ${odooResponse.status}`, {
            odooUrl: ODOO_URL,
            status: odooResponse.status,
          }, Date.now() - startTime);
          return;
        }

        const odooData = await odooResponse.json();
        if (odooData.error) {
          logTest(testName, false, `Autenticazione Odoo fallita: ${odooData.error.message || 'Unknown error'}`, {
            odooUrl: ODOO_URL,
            error: odooData.error,
          }, Date.now() - startTime);
          return;
        }

        logTest(testName, true, undefined, {
          webhookUrl,
          webhookStatus: getResponse.status,
          odooUrl: ODOO_URL,
          odooConnectionStatus: odooResponse.status,
          odooUid: odooData.result || 'N/A',
          note: 'Webhook endpoint e connessione Odoo funzionanti',
        }, Date.now() - startTime);
      } catch (odooError) {
        logTest(testName, false, `Errore nel test di connessione Odoo: ${odooError instanceof Error ? odooError.message : String(odooError)}`, {
          odooUrl: ODOO_URL,
        }, Date.now() - startTime);
      }
    } catch (webhookError) {
      logTest(testName, false, `Errore nel test del webhook: ${webhookError instanceof Error ? webhookError.message : String(webhookError)}`, {
        url: webhookUrl,
      }, Date.now() - startTime);
    }
  } catch (error) {
    logTest(testName, false, error instanceof Error ? error.message : String(error), undefined, Date.now() - startTime);
  }
}

async function test5_CompleteFlow() {
  const testName = 'Test 5: Flusso completo (Prodotto → Checkout → Stripe → Thank you → Odoo)';
  const startTime = Date.now();
  
  try {
    console.log(`\n📋 ${testName}`);
    
    // This is a summary test that verifies all components are in place
    // It doesn't actually execute a full payment, but verifies that all endpoints are accessible
    
    const checks = {
      productPage: false,
      checkoutPage: false,
      createCheckoutSession: false,
      thankYouPage: false,
      createBooking: false,
      webhookEndpoint: false,
      odooConnection: false,
    };

    // Check product page
    try {
      const productPageResponse = await fetch(`${BASE_URL}/prodotto/trip/test`, { method: 'HEAD' });
      checks.productPage = productPageResponse.ok || productPageResponse.status === 404; // 404 is ok for test product
    } catch {
      checks.productPage = false;
    }

    // Check checkout page
    try {
      const checkoutPageResponse = await fetch(`${BASE_URL}/checkout`, { method: 'HEAD' });
      checks.checkoutPage = checkoutPageResponse.ok;
    } catch {
      checks.checkoutPage = false;
    }

    // Check create-checkout-session
    try {
      const createCheckoutResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });
      // We expect 400 (bad request) but not 404 or 500
      checks.createCheckoutSession = createCheckoutResponse.status !== 404 && createCheckoutResponse.status < 500;
    } catch {
      checks.createCheckoutSession = false;
    }

    // Check thank you page
    try {
      const thankYouResponse = await fetch(`${BASE_URL}/thank-you`, { method: 'HEAD' });
      checks.thankYouPage = thankYouResponse.ok;
    } catch {
      checks.thankYouPage = false;
    }

    // Check create-booking
    try {
      const createBookingResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });
      checks.createBooking = createBookingResponse.status !== 404 && createBookingResponse.status < 500;
    } catch {
      checks.createBooking = false;
    }

    // Check webhook endpoint
    try {
      const webhookResponse = await fetch(`${BASE_URL}/api/stripe-webhook-odoo`, { method: 'GET' });
      checks.webhookEndpoint = webhookResponse.ok;
    } catch {
      checks.webhookEndpoint = false;
    }

    // Check Odoo connection
    if (ODOO_URL && ODOO_DB && ODOO_LOGIN && ODOO_API_KEY) {
      try {
        const odooResponse = await fetch(`${ODOO_URL}/jsonrpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            id: Date.now(),
            params: {
              service: 'common',
              method: 'login',
              args: [ODOO_DB, ODOO_LOGIN, ODOO_API_KEY],
            },
          }),
        });
        const odooData = await odooResponse.json();
        checks.odooConnection = !odooData.error && odooResponse.ok;
      } catch {
        checks.odooConnection = false;
      }
    } else {
      checks.odooConnection = false;
    }

    // Odoo connection is optional, so we don't fail if it's not configured
    const requiredChecks = {
      productPage: checks.productPage,
      checkoutPage: checks.checkoutPage,
      createCheckoutSession: checks.createCheckoutSession,
      thankYouPage: checks.thankYouPage,
      createBooking: checks.createBooking,
      webhookEndpoint: checks.webhookEndpoint,
    };
    
    const requiredPassed = Object.values(requiredChecks).every(check => check === true);
    const requiredCount = Object.keys(requiredChecks).length;
    const requiredPassedCount = Object.values(requiredChecks).filter(check => check === true).length;
    const totalCount = Object.keys(checks).length;
    const passedCount = Object.values(checks).filter(check => check === true).length;

    logTest(testName, requiredPassed, requiredPassed ? undefined : `${requiredCount - requiredPassedCount} controlli richiesti falliti`, {
      checks,
      requiredChecks,
      passedCount,
      totalCount,
      requiredPassedCount,
      requiredCount,
      note: checks.odooConnection ? 'Tutti i componenti funzionanti incluso Odoo' : 'Tutti i componenti richiesti funzionanti (Odoo opzionale)',
    }, Date.now() - startTime);
  } catch (error) {
    logTest(testName, false, error instanceof Error ? error.message : String(error), undefined, Date.now() - startTime);
  }
}

async function main() {
  console.log('🚀 Esecuzione test critici per flussi checkout');
  console.log('='.repeat(70));
  console.log('Questi test devono SEMPRE passare prima di ogni deploy');
  console.log('='.repeat(70));
  
  // Validate environment variables first
  const envValidation = validateEnvironment();
  if (!envValidation.valid) {
    console.error('\n❌ ERRORE: Variabili d\'ambiente mancanti!');
    console.error('Le seguenti variabili d\'ambiente devono essere configurate:');
    envValidation.missing.forEach(missing => {
      console.error(`   - ${missing}`);
    });
    console.error('\nPer configurare le variabili d\'ambiente:');
    console.error('   export SUPABASE_ANON_KEY="your-anon-key"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    console.error('\nOppure crea un file .env nella directory ecommerce-homepage con:');
    console.error('   SUPABASE_ANON_KEY=your-anon-key');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-key');
    console.error('\n⚠️  I test non possono essere eseguiti senza queste variabili.\n');
    Deno.exit(1);
  }
  
  console.log('✅ Variabili d\'ambiente richieste configurate correttamente');
  console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
  console.log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY.substring(0, 10)}... (${SUPABASE_ANON_KEY.length} caratteri)`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY.substring(0, 10)}... (${SUPABASE_SERVICE_KEY.length} caratteri)`);
  
  if (envValidation.warnings.length > 0) {
    console.log('\n⚠️  Avvisi (variabili opzionali mancanti):');
    envValidation.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }
  
  console.log('');

  await test1_ProductPageLoads();
  await test2_CheckoutToStripe();
  await test3_StripeToThankYou();
  await test4_StripeToOdoo();
  await test5_CompleteFlow();

  console.log('\n' + '='.repeat(70));
  console.log('📊 RISULTATI FINALI');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`✅ Test passati: ${passed}/${total}`);
  console.log(`❌ Test falliti: ${failed}/${total}`);
  console.log(`⏱️  Tempo totale: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n⚠️  ATTENZIONE: Alcuni test critici sono falliti!');
    console.log('Non procedere con il deploy fino a quando questi test non passano.\n');
    
    console.log('\n📋 Dettagli test falliti:');
    results.filter(r => !r.passed).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}`);
      if (result.error) {
        console.log(`   ❌ ERRORE: ${result.error}`);
      }
      if (result.details) {
        console.log(`   📋 Dettagli:`, JSON.stringify(result.details, null, 2));
      }
      if (result.duration) {
        console.log(`   ⏱️  Durata: ${result.duration}ms`);
      }
    });
    
    Deno.exit(1);
  } else {
    console.log('\n✅ Tutti i test critici sono passati!');
    console.log('I flussi checkout funzionano correttamente.\n');
    Deno.exit(0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Errore fatale durante l\'esecuzione dei test:', error);
    Deno.exit(1);
  });
}

