/**
 * Script di Test Booking usando Node.js e Supabase Client
 * Funziona senza bisogno di psql o deno
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY deve essere impostato');
  console.error('   Esporta la variabile: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestBooking(productType) {
  const idempotencyKey = randomUUID();
  const sessionId = `cs_test_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
  
  console.log(`\n🧪 Testing ${productType} booking...`);
  console.log(`   Idempotency Key: ${idempotencyKey}`);
  console.log(`   Session ID: ${sessionId}`);

  try {
    // Trova un prodotto esistente
    const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
    let { data: products, error: productError } = await supabase
      .from(tableName)
      .select('id, provider_id, name')
      .eq('active', true)
      .limit(1);

    if (productError || !products || products.length === 0) {
      console.log(`   ⚠️  Nessun ${productType} attivo trovato, creando uno di test...`);
      
      // Trova un provider
      const { data: providers } = await supabase
        .from('profile')
        .select('id')
        .eq('active', true)
        .limit(1);
      
      if (!providers || providers.length === 0) {
        return { success: false, error: 'No active provider found' };
      }
      
      const providerId = providers[0].id;
      
      // Crea prodotto di test
      const productData = {
        name: `Test ${productType}`,
        description: `Test ${productType} for booking`,
        active: true,
        provider_id: providerId,
        price_adult_base: 50.00,
        price_dog_base: 25.00,
      };
      
      if (productType === 'trip') {
        const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000);
        productData.start_date = startDate.toISOString().split('T')[0];
        productData.end_date = endDate.toISOString().split('T')[0];
      }
      
      const { data: newProduct, error: createError } = await supabase
        .from(tableName)
        .insert(productData)
        .select('id, provider_id, name')
        .single();
      
      if (createError || !newProduct) {
        return { success: false, error: `Failed to create product: ${createError?.message}` };
      }
      
      products = [newProduct];
    }

    const product = products[0];
    let providerId = product.provider_id;

    if (!providerId) {
      const { data: providers } = await supabase
        .from('profile')
        .select('id')
        .eq('active', true)
        .limit(1);
      
      if (!providers || providers.length === 0) {
        return { success: false, error: 'No active provider found' };
      }
      providerId = providers[0].id;
    }

    // Trova o crea slot
    let { data: slots } = await supabase
      .from('availability_slot')
      .select('id')
      .eq('product_type', productType)
      .eq('product_id', product.id)
      .limit(1);

    let slotId = null;
    if (slots && slots.length > 0) {
      slotId = slots[0].id;
    } else {
      const bookingDate = productType === 'trip' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: newSlot, error: slotError } = await supabase
        .from('availability_slot')
        .insert({
          product_id: product.id,
          product_type: productType,
          date: bookingDate,
          max_adults: 10,
          max_dogs: 5,
          booked_adults: 0,
          booked_dogs: 0,
        })
        .select('id')
        .single();

      if (slotError || !newSlot) {
        return { success: false, error: `Failed to create slot: ${slotError?.message}` };
      }
      slotId = newSlot.id;
    }

    // Chiama funzione transazionale
    const bookingDate = productType === 'trip' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const tripStartDate = productType === 'trip' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;
    const tripEndDate = productType === 'trip' 
      ? new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    console.log(`   📞 Chiamando funzione transazionale...`);

    const { data: result, error: rpcError } = await supabase.rpc(
      'create_booking_transactional',
      {
        p_idempotency_key: idempotencyKey,
        p_product_type: productType,
        p_provider_id: providerId,
        p_availability_slot_id: slotId,
        p_stripe_checkout_session_id: sessionId,
        p_stripe_payment_intent_id: `pi_test_${randomUUID().replace(/-/g, '').substring(0, 24)}`,
        p_order_number: sessionId.slice(-8).toUpperCase(),
        p_booking_date: bookingDate,
        p_booking_time: new Date().toISOString(),
        p_number_of_adults: 2,
        p_number_of_dogs: 1,
        p_total_amount_paid: 100.00,
        p_customer_email: `test-${productType}@example.com`,
        p_customer_name: `Test ${productType}`,
        p_product_name: product.name || `Test ${productType}`,
        p_trip_start_date: tripStartDate,
        p_trip_end_date: tripEndDate,
      }
    );

    if (rpcError) {
      console.error(`   ❌ RPC Error: ${rpcError.message}`);
      console.error(`   Code: ${rpcError.code}`);
      console.error(`   Details: ${JSON.stringify(rpcError, null, 2)}`);
      return { success: false, error: rpcError.message };
    }

    if (!result || result.length === 0) {
      return { success: false, error: 'No result from RPC' };
    }

    const rpcResult = result[0];
    if (!rpcResult.success) {
      return { success: false, error: rpcResult.error_message || 'Unknown error' };
    }

    const bookingId = rpcResult.booking_id;
    console.log(`   ✅ Booking created: ${bookingId}`);

    // Verifica idempotency_key
    const { data: booking, error: fetchError } = await supabase
      .from('booking')
      .select('id, idempotency_key, order_number, product_type')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      return { success: false, error: `Failed to fetch booking: ${fetchError.message}` };
    }

    if (booking.idempotency_key) {
      console.log(`   ✅ Idempotency Key: ${booking.idempotency_key}`);
      console.log(`   ✅ Order Number: ${booking.order_number}`);
      return { 
        success: true, 
        bookingId, 
        hasIdempotencyKey: true, 
        idempotencyKey: booking.idempotency_key,
        orderNumber: booking.order_number,
        productType: booking.product_type
      };
    } else {
      console.error(`   ❌ Idempotency Key is NULL!`);
      console.error(`   Expected: ${idempotencyKey}`);
      console.error(`   Actual: NULL`);
      return { success: false, bookingId, hasIdempotencyKey: false, error: 'Idempotency key is NULL' };
    }
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('🚀 Starting Automatic Booking Tests\n');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Presente' : '❌ Mancante'}`);
  console.log('='.repeat(60));

  const productTypes = ['experience', 'class', 'trip'];
  const results = [];

  for (const productType of productTypes) {
    const result = await createTestBooking(productType);
    results.push({ productType, ...result });
    
    if (result.success && result.hasIdempotencyKey) {
      console.log(`\n✅ ${productType}: SUCCESS`);
    } else {
      console.log(`\n❌ ${productType}: FAILED - ${result.error}`);
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
      console.log(`   Order Number: ${result.orderNumber}`);
    }
  });

  if (failCount > 0) {
    console.log('\n❌ Alcuni test sono falliti. Verifica i logs sopra.');
    process.exit(1);
  } else {
    console.log('\n✅ Tutti i test sono passati!');
    process.exit(0);
  }
}

main().catch(console.error);




