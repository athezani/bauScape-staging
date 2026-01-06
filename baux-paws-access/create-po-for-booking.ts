/**
 * Script per creare PO in Odoo per un booking specifico
 * 
 * Uso: deno run --allow-net --allow-env create-po-for-booking.ts WKQCUPUX
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
} from './supabase/functions/_shared/odoo/index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from './supabase/functions/_shared/odoo/bookingMapper.ts';

const orderNumber = Deno.args[0] || 'WKQCUPUX';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPOForBooking() {
  console.log('🔍 Cercando booking #' + orderNumber + '...\n');

  // 1. Cerca booking
  const { data: bookings, error: bookingError } = await supabase
    .from('booking')
    .select(`
      id,
      order_number,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      customer_email,
      customer_name,
      customer_surname,
      customer_phone,
      customer_fiscal_code,
      customer_address,
      product_type,
      availability_slot_id,
      product_name,
      product_description,
      provider_id,
      booking_date,
      booking_time,
      number_of_adults,
      number_of_dogs,
      total_amount_paid,
      currency,
      provider_cost_total,
      stripe_fee,
      internal_margin,
      net_revenue,
      trip_start_date,
      trip_end_date
    `)
    .eq('order_number', orderNumber)
    .limit(1);

  if (bookingError) {
    console.error('❌ Errore nel recupero booking:', bookingError);
    Deno.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.error('❌ Booking #' + orderNumber + ' non trovato');
    Deno.exit(1);
  }

  const booking = bookings[0];
  console.log('✅ Booking trovato:');
  console.log('  ID:', booking.id);
  console.log('  Order Number:', booking.order_number);
  console.log('  Provider Cost Total:', booking.provider_cost_total);
  console.log('  Payment Intent ID:', booking.stripe_payment_intent_id);
  console.log('  Provider ID:', booking.provider_id);
  console.log('  Product:', booking.product_name);
  console.log('  Customer:', booking.customer_email);
  console.log('');

  if (!booking.provider_cost_total || booking.provider_cost_total <= 0) {
    console.error('❌ Booking non ha provider_cost_total > 0. Impossibile creare PO.');
    Deno.exit(1);
  }

  // 2. Recupera product_id da availability_slot
  let productId: string | null = null;
  if (booking.availability_slot_id) {
    const { data: slot } = await supabase
      .from('availability_slot')
      .select('product_id, product_type')
      .eq('id', booking.availability_slot_id)
      .single();

    if (slot) {
      productId = slot.product_id;
      console.log('✅ Product ID recuperato da availability_slot:', productId);
    }
  }

  if (!productId) {
    console.error('❌ Impossibile recuperare product_id (availability_slot_id mancante o non trovato)');
    Deno.exit(1);
  }

  // 3. Recupera provider
  const { data: provider } = await supabase
    .from('profile')
    .select('id, company_name, contact_name, email, phone')
    .eq('id', booking.provider_id)
    .single();

  if (!provider) {
    console.error('❌ Provider non trovato');
    Deno.exit(1);
  }

  console.log('✅ Provider trovato:', provider.company_name);
  console.log('');

  // 4. Recupera prodotto
  const tableName = booking.product_type === 'experience' ? 'experience' :
                   booking.product_type === 'class' ? 'class' : 'trip';

  const { data: product } = await supabase
    .from(tableName)
    .select('id, name, description')
    .eq('id', productId)
    .single();

  if (!product) {
    console.error('❌ Prodotto non trovato');
    Deno.exit(1);
  }

  console.log('✅ Prodotto trovato:', product.name);
  console.log('');

  // 5. Prepara dati per Odoo
  const bookingWithProductId = {
    ...booking,
    product_id: productId,
  };

  const bookingData = mapBookingToOdoo(bookingWithProductId, provider, product);

  // 6. Valida
  const validationErrors = validateBookingDataForOdoo(bookingData);
  if (validationErrors.length > 0) {
    console.error('❌ Errori di validazione:', validationErrors.join(', '));
    Deno.exit(1);
  }

  // 7. Verifica configurazione Odoo
  const config = getActiveOdooConfig();
  if (!config || !validateOdooConfig(config)) {
    console.error('❌ Configurazione Odoo non disponibile');
    console.error('   Configura OD_URL, OD_DB_NAME, OD_LOGIN, OD_API_KEY');
    Deno.exit(1);
  }

  console.log('✅ Configurazione Odoo OK');
  console.log('   URL:', config.url);
  console.log('   Database:', config.database);
  console.log('');

  // 8. Crea PO
  console.log('🚀 Creando Purchase Order in Odoo...\n');
  const poResult = await createOdooPurchaseOrder(config, bookingData);

  if (poResult.success) {
    console.log('\n✅ Purchase Order creato/aggiornato con successo!');
    console.log('   PO ID:', poResult.purchaseOrderId);
    if (poResult.skipped) {
      console.log('   ⚠️  Riga già esistente (duplicato rilevato e saltato)');
      console.log('   Motivo:', poResult.reason);
    }
  } else {
    console.error('\n❌ Errore nella creazione del Purchase Order:');
    console.error('   Errore:', poResult.error);
    if (poResult.errorDetails) {
      console.error('   Dettagli:', JSON.stringify(poResult.errorDetails, null, 2));
    }
    Deno.exit(1);
  }
}

createPOForBooking().catch((error) => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});



