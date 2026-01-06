/**
 * Test End-to-End: 10 Booking Reali in Staging
 * 
 * Questo script simula 10 booking completi end-to-end:
 * 1. Crea checkout session Stripe (test mode)
 * 2. Simula pagamento completato
 * 3. Crea booking via webhook/ensure-booking
 * 4. Verifica che tutto funzioni correttamente
 * 
 * Esegui con:
 * deno run --allow-net --allow-env --allow-read test-10-bookings-staging.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.0.0?target=deno';

// Staging environment
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ilbbviadwedumvvwqqon.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const BASE_URL = Deno.env.get('BASE_URL') || 'https://staging.flixdog.com';

if (!SUPABASE_SERVICE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY e STRIPE_SECRET_KEY devono essere impostati');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

interface BookingTest {
  index: number;
  productType: 'experience' | 'class' | 'trip';
  productId: string;
  productName: string;
  slotId?: string;
  bookingDate: string;
  adults: number;
  dogs: number;
  customerEmail: string;
  customerName: string;
  success: boolean;
  bookingId?: string;
  sessionId?: string;
  error?: string;
}

const results: BookingTest[] = [];

async function findAvailableProduct(productType: 'experience' | 'class' | 'trip') {
  const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
  
  const { data: products, error } = await supabase
    .from(tableName)
    .select('id, name, provider_id, active')
    .eq('active', true)
    .limit(5);

  if (error || !products || products.length === 0) {
    return null;
  }

  // Trova uno slot disponibile per questo prodotto
  for (const product of products) {
    const { data: slots } = await supabase
      .from('availability_slot')
      .select('id, date, max_adults, max_dogs, booked_adults, booked_dogs')
      .eq('product_type', productType)
      .eq('product_id', product.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .limit(1);

    if (slots && slots.length > 0) {
      const slot = slots[0];
      const availableAdults = (slot.max_adults || 10) - (slot.booked_adults || 0);
      const availableDogs = (slot.max_dogs || 5) - (slot.booked_dogs || 0);
      
      if (availableAdults > 0) {
        return {
          product,
          slot,
          availableAdults,
          availableDogs,
        };
      }
    }
  }

  return null;
}

async function createStripeCheckoutSession(
  productType: 'experience' | 'class' | 'trip',
  productId: string,
  productName: string,
  slotId: string | null,
  bookingDate: string,
  adults: number,
  dogs: number,
  customerEmail: string,
  customerName: string
): Promise<{ sessionId: string; url: string } | null> {
  try {
    // Calcola prezzo (simplificato per test)
    const basePrice = productType === 'trip' ? 50000 : productType === 'experience' ? 30000 : 20000;
    const adultPrice = basePrice;
    const dogPrice = basePrice * 0.5;
    const totalAmount = (adults * adultPrice) + (dogs * dogPrice);

    // Crea customer Stripe
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        product_type: productType,
        product_id: productId,
      },
    });

    // Crea checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: `${adults} adulti, ${dogs} cani - ${bookingDate}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        product_type: productType,
        product_id: productId,
        availability_slot_id: slotId || '',
        booking_date: bookingDate,
        number_of_adults: adults.toString(),
        number_of_dogs: dogs.toString(),
        customer_name: customerName,
        customer_email: customerEmail,
      },
      success_url: `${BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/checkout`,
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    console.error(`   ❌ Errore creazione Stripe session:`, error);
    return null;
  }
}

async function simulatePayment(sessionId: string): Promise<boolean> {
  try {
    // Recupera la session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.payment_intent) {
      // Crea payment intent se non esiste
      const paymentIntent = await stripe.paymentIntents.create({
        amount: session.amount_total || 0,
        currency: session.currency || 'eur',
        customer: session.customer as string,
        metadata: session.metadata || {},
      });

      // Simula pagamento completato
      await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: 'pm_card_visa',
      });
    } else {
      // Se esiste già, confermalo
      await stripe.paymentIntents.confirm(session.payment_intent as string, {
        payment_method: 'pm_card_visa',
      });
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Errore simulazione pagamento:`, error);
    return false;
  }
}

async function createBookingViaWebhook(sessionId: string): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Recupera session da Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Simula webhook chiamando ensure-booking
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ensure-booking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
      }),
    });

    const data = await response.json();

    if (data.success && data.bookingId) {
      return { success: true, bookingId: data.bookingId };
    } else {
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function createTestBooking(index: number): Promise<BookingTest> {
  const productTypes: Array<'experience' | 'class' | 'trip'> = ['experience', 'class', 'trip'];
  const productType = productTypes[index % productTypes.length];
  
  console.log(`\n📦 [${index + 1}/10] Creando booking ${productType}...`);

  // Trova prodotto disponibile
  const productInfo = await findAvailableProduct(productType);
  if (!productInfo) {
    return {
      index,
      productType,
      productId: '',
      productName: `No ${productType} available`,
      bookingDate: '',
      adults: 0,
      dogs: 0,
      customerEmail: '',
      customerName: '',
      success: false,
      error: `No available ${productType} found`,
    };
  }

  const { product, slot, availableAdults, availableDogs } = productInfo;
  const adults = Math.min(availableAdults, Math.floor(Math.random() * 3) + 1);
  const dogs = Math.min(availableDogs, Math.floor(Math.random() * 2));
  const bookingDate = slot.date;

  const customerEmail = `test-booking-${index + 1}@flixdog-test.com`;
  const customerName = `Test User ${index + 1}`;

  console.log(`   Prodotto: ${product.name}`);
  console.log(`   Data: ${bookingDate}`);
  console.log(`   Ospiti: ${adults} adulti, ${dogs} cani`);
  console.log(`   Email: ${customerEmail}`);

  // Crea Stripe checkout session
  console.log(`   🔄 Creando Stripe checkout session...`);
  const session = await createStripeCheckoutSession(
    productType,
    product.id,
    product.name,
    slot.id,
    bookingDate,
    adults,
    dogs,
    customerEmail,
    customerName
  );

  if (!session) {
    return {
      index,
      productType,
      productId: product.id,
      productName: product.name,
      slotId: slot.id,
      bookingDate,
      adults,
      dogs,
      customerEmail,
      customerName,
      success: false,
      error: 'Failed to create Stripe session',
    };
  }

  console.log(`   ✅ Session creata: ${session.sessionId}`);

  // Simula pagamento
  console.log(`   💳 Simulando pagamento...`);
  const paymentSuccess = await simulatePayment(session.sessionId);
  if (!paymentSuccess) {
    return {
      index,
      productType,
      productId: product.id,
      productName: product.name,
      slotId: slot.id,
      bookingDate,
      adults,
      dogs,
      customerEmail,
      customerName,
      sessionId: session.sessionId,
      success: false,
      error: 'Failed to simulate payment',
    };
  }

  console.log(`   ✅ Pagamento simulato`);

  // Crea booking via ensure-booking
  console.log(`   📝 Creando booking...`);
  const bookingResult = await createBookingViaWebhook(session.sessionId);
  
  if (!bookingResult.success) {
    return {
      index,
      productType,
      productId: product.id,
      productName: product.name,
      slotId: slot.id,
      bookingDate,
      adults,
      dogs,
      customerEmail,
      customerName,
      sessionId: session.sessionId,
      success: false,
      error: bookingResult.error,
    };
  }

  console.log(`   ✅ Booking creato: ${bookingResult.bookingId}`);

  return {
    index,
    productType,
    productId: product.id,
    productName: product.name,
    slotId: slot.id,
    bookingDate,
    adults,
    dogs,
    customerEmail,
    customerName,
    sessionId: session.sessionId,
    bookingId: bookingResult.bookingId,
    success: true,
  };
}

async function main() {
  console.log('🚀 Test End-to-End: 10 Booking Reali in Staging');
  console.log('='.repeat(60));
  console.log(`📍 Supabase: ${SUPABASE_URL}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  // Crea 10 booking
  for (let i = 0; i < 10; i++) {
    const result = await createTestBooking(i);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ [${i + 1}/10] Booking ${result.productType} creato con successo`);
    } else {
      console.log(`❌ [${i + 1}/10] Booking fallito: ${result.error}`);
    }

    // Pausa tra i booking per evitare rate limiting
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Riepilogo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO TEST');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Booking riusciti: ${successful}/10`);
  console.log(`❌ Booking falliti: ${failed}/10`);

  if (successful > 0) {
    console.log('\n✅ Booking creati con successo:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   - ${r.productType}: ${r.productName} (${r.bookingId})`);
    });
  }

  if (failed > 0) {
    console.log('\n❌ Booking falliti:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.productType}: ${r.error}`);
    });
  }

  // Verifica nel database
  console.log('\n🔍 Verifica nel database...');
  const { data: bookings, error } = await supabase
    .from('booking')
    .select('id, product_type, order_number, customer_email, created_at')
    .in('id', results.filter(r => r.bookingId).map(r => r.bookingId!))
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Errore verifica database:', error);
  } else {
    console.log(`✅ Trovati ${bookings?.length || 0} booking nel database`);
    if (bookings && bookings.length > 0) {
      bookings.forEach(b => {
        console.log(`   - ${b.product_type}: ${b.order_number} (${b.customer_email})`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(successful === 10 ? '🎉 TUTTI I TEST PASSATI!' : '⚠️  Alcuni test sono falliti');
  console.log('='.repeat(60));
}

main().catch(console.error);

