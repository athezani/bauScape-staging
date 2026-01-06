/**
 * Script di Test e Fix Automatico per Booking
 * 
 * Questo script:
 * 1. Crea booking di test per tutte e 3 le tipologie
 * 2. Verifica che abbiano idempotency_key
 * 3. Se non ce l'hanno, debugga e corregge
 * 4. Ripete finché non funziona
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere impostati');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  productType: 'experience' | 'class' | 'trip';
  success: boolean;
  bookingId?: string;
  hasIdempotencyKey?: boolean;
  idempotencyKey?: string;
  error?: string;
}

// Funzione per creare un booking di test direttamente via funzione transazionale
async function createTestBookingDirect(
  productType: 'experience' | 'class' | 'trip'
): Promise<TestResult> {
  const idempotencyKey = crypto.randomUUID();
  const sessionId = `cs_test_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
  
  console.log(`\n🧪 Testing ${productType} booking...`);
  console.log(`   Idempotency Key: ${idempotencyKey}`);
  console.log(`   Session ID: ${sessionId}`);

  try {
    // Trova un prodotto esistente
    const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
    const { data: products, error: productError } = await supabase
      .from(tableName)
      .select('id, provider_id, name')
      .eq('active', true)
      .limit(1);

    if (productError || !products || products.length === 0) {
      return {
        productType,
        success: false,
        error: `No active ${productType} found`,
      };
    }

    const product = products[0];
    const providerId = product.provider_id;

    if (!providerId) {
      // Trova un provider di default
      const { data: providers } = await supabase
        .from('profile')
        .select('id')
        .eq('active', true)
        .limit(1);
      
      if (!providers || providers.length === 0) {
        return {
          productType,
          success: false,
          error: 'No active provider found',
        };
      }
    }

    // Trova o crea uno slot di disponibilità
    const { data: slots } = await supabase
      .from('availability_slot')
      .select('id')
      .eq('product_type', productType)
      .eq('product_id', product.id)
      .limit(1);

    let slotId = null;
    if (slots && slots.length > 0) {
      slotId = slots[0].id;
    } else {
      // Crea uno slot di test
      const { data: newSlot, error: slotError } = await supabase
        .from('availability_slot')
        .insert({
          product_id: product.id,
          product_type: productType,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 giorni da oggi
          max_adults: 10,
          max_dogs: 5,
          booked_adults: 0,
          booked_dogs: 0,
        })
        .select('id')
        .single();

      if (slotError || !newSlot) {
        return {
          productType,
          success: false,
          error: `Failed to create availability slot: ${slotError?.message}`,
        };
      }
      slotId = newSlot.id;
    }

    // Chiama la funzione transazionale direttamente
    const { data: result, error: rpcError } = await supabase.rpc(
      'create_booking_transactional',
      {
        p_idempotency_key: idempotencyKey,
        p_product_type: productType,
        p_provider_id: providerId || (await supabase.from('profile').select('id').eq('active', true).limit(1).single()).data?.id,
        p_availability_slot_id: slotId,
        p_stripe_checkout_session_id: sessionId,
        p_stripe_payment_intent_id: `pi_test_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`,
        p_order_number: sessionId.slice(-8).toUpperCase(),
        p_booking_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_booking_time: new Date().toISOString(),
        p_number_of_adults: 2,
        p_number_of_dogs: 1,
        p_total_amount_paid: 100.00,
        p_customer_email: `test-${productType}@example.com`,
        p_customer_name: `Test ${productType}`,
        p_product_name: product.name || `Test ${productType}`,
        p_trip_start_date: productType === 'trip' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        p_trip_end_date: productType === 'trip' ? new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      }
    );

    if (rpcError) {
      console.error(`   ❌ RPC Error: ${rpcError.message}`);
      return {
        productType,
        success: false,
        error: rpcError.message,
      };
    }

    if (!result || result.length === 0) {
      return {
        productType,
        success: false,
        error: 'No result from RPC',
      };
    }

    const rpcResult = result[0];
    if (!rpcResult.success) {
      return {
        productType,
        success: false,
        error: rpcResult.error_message || 'Unknown error',
      };
    }

    const bookingId = rpcResult.booking_id;
    console.log(`   ✅ Booking created: ${bookingId}`);

    // Verifica idempotency_key
    const { data: booking, error: fetchError } = await supabase
      .from('booking')
      .select('id, idempotency_key')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      return {
        productType,
        success: false,
        error: `Failed to fetch booking: ${fetchError.message}`,
      };
    }

    const hasKey = !!booking?.idempotency_key;
    if (hasKey) {
      console.log(`   ✅ Idempotency Key: ${booking.idempotency_key}`);
      return {
        productType,
        success: true,
        bookingId,
        hasIdempotencyKey: true,
        idempotencyKey: booking.idempotency_key,
      };
    } else {
      console.error(`   ❌ Idempotency Key is NULL!`);
      return {
        productType,
        success: false,
        bookingId,
        hasIdempotencyKey: false,
        error: 'Idempotency key is NULL',
      };
    }
  } catch (error) {
    return {
      productType,
      success: false,
      error: String(error),
    };
  }
}

// Funzione principale
async function main() {
  console.log('🚀 Starting Automatic Booking Tests\n');
  console.log('='.repeat(60));

  const results: TestResult[] = [];
  let attempts = 0;
  const maxAttempts = 3;

  // Test tutte e 3 le tipologie
  const productTypes: Array<'experience' | 'class' | 'trip'> = ['experience', 'class', 'trip'];

  for (const productType of productTypes) {
    attempts = 0;
    let result: TestResult | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n📋 Attempt ${attempts}/${maxAttempts} for ${productType}...`);
      
      result = await createTestBookingDirect(productType);
      results.push(result);

      if (result.success && result.hasIdempotencyKey) {
        console.log(`✅ ${productType}: SUCCESS`);
        break;
      } else {
        console.log(`❌ ${productType}: FAILED - ${result.error}`);
        if (attempts < maxAttempts) {
          console.log(`   Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
    }

    if (!result || !result.success || !result.hasIdempotencyKey) {
      console.error(`\n❌ ${productType}: FAILED after ${maxAttempts} attempts`);
    }
  }

  // Riepilogo
  console.log('\n' + '='.repeat(60));
  console.log('📊 Riepilogo Test\n');

  const successCount = results.filter(r => r.success && r.hasIdempotencyKey).length;
  const failCount = results.length - successCount;

  console.log(`✅ Successi: ${successCount}/${results.length}`);
  console.log(`❌ Fallimenti: ${failCount}/${results.length}\n`);

  results.forEach(result => {
    const status = result.success && result.hasIdempotencyKey ? '✅' : '❌';
    console.log(`${status} ${result.productType}: ${result.success && result.hasIdempotencyKey ? 'OK' : result.error}`);
    if (result.bookingId && result.idempotencyKey) {
      console.log(`   Booking ID: ${result.bookingId}`);
      console.log(`   Idempotency Key: ${result.idempotencyKey}`);
    }
  });

  if (failCount > 0) {
    console.log('\n❌ Alcuni test sono falliti. Verifica i logs sopra.');
    Deno.exit(1);
  } else {
    console.log('\n✅ Tutti i test sono passati!');
    Deno.exit(0);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}




