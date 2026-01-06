/**
 * Script per verificare i dettagli di un booking e simulare la chiamata Odoo PO
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActiveOdooConfig,
  validateOdooConfig,
} from './supabase/functions/_shared/odoo/index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from './supabase/functions/_shared/odoo/bookingMapper.ts';

const orderNumber = Deno.args[0] || 'QBFS1NX7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBooking() {
  console.log('🔍 Verificando booking #' + orderNumber + '...\n');

  // 1. Cerca booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select(`
      id,
      order_number,
      created_at,
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
    .single();

  if (bookingError) {
    console.error('❌ Errore nel recupero booking:', bookingError);
    Deno.exit(1);
  }

  if (!booking) {
    console.error('❌ Booking #' + orderNumber + ' non trovato');
    Deno.exit(1);
  }

  console.log('✅ Booking trovato:');
  console.log('  ID:', booking.id);
  console.log('  Order Number:', booking.order_number);
  console.log('  Created At:', booking.created_at);
  console.log('  Provider Cost Total:', booking.provider_cost_total);
  console.log('  Payment Intent ID:', booking.stripe_payment_intent_id);
  console.log('  Provider ID:', booking.provider_id);
  console.log('  Product:', booking.product_name);
  console.log('  Customer:', booking.customer_email);
  console.log('');

  // 2. Verifica configurazione Odoo
  console.log('🔧 Verificando configurazione Odoo...');
  const odooConfig = getActiveOdooConfig();
  
  console.log('  OD_URL disponibile:', !!Deno.env.get('OD_URL'));
  console.log('  OD_DB_NAME disponibile:', !!Deno.env.get('OD_DB_NAME'));
  console.log('  OD_LOGIN disponibile:', !!Deno.env.get('OD_LOGIN'));
  console.log('  OD_API_KEY disponibile:', !!Deno.env.get('OD_API_KEY'));
  console.log('  Config object:', odooConfig ? '✅ Disponibile' : '❌ Non disponibile');
  console.log('  Config valida:', odooConfig && validateOdooConfig(odooConfig) ? '✅ Valida' : '❌ Non valida');
  console.log('');

  if (!odooConfig || !validateOdooConfig(odooConfig)) {
    console.error('❌ Configurazione Odoo non disponibile o non valida');
    console.error('   Questo potrebbe essere il motivo per cui il PO non è stato creato automaticamente.');
    Deno.exit(1);
  }

  // 3. Verifica dati necessari
  if (!booking.provider_cost_total || booking.provider_cost_total <= 0) {
    console.error('❌ Booking non ha provider_cost_total > 0. Impossibile creare PO.');
    Deno.exit(1);
  }

  // 4. Recupera product_id da availability_slot
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

  // 5. Recupera provider
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

  // 6. Recupera prodotto
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

  // 7. Prepara dati per Odoo
  const bookingWithProductId = {
    ...booking,
    product_id: productId,
  };

  const bookingData = mapBookingToOdoo(bookingWithProductId, provider, product);

  // 8. Valida
  const validationErrors = validateBookingDataForOdoo(bookingData);
  if (validationErrors.length > 0) {
    console.error('❌ Errori di validazione:', validationErrors.join(', '));
    Deno.exit(1);
  }

  console.log('✅ Dati validati con successo');
  console.log('');

  // 9. Simula la chiamata (senza creare effettivamente il PO)
  console.log('📋 Riepilogo:');
  console.log('  ✅ Booking trovato e valido');
  console.log('  ✅ Configurazione Odoo disponibile e valida');
  console.log('  ✅ Provider trovato');
  console.log('  ✅ Prodotto trovato');
  console.log('  ✅ Dati validati');
  console.log('');
  console.log('💡 Se il PO non è stato creato automaticamente, potrebbe essere perché:');
  console.log('   1. La funzione create-booking non è stata chiamata per questo booking');
  console.log('   2. C\'è stato un errore silenzioso durante la creazione del PO');
  console.log('   3. Le variabili d\'ambiente non erano disponibili al momento della creazione');
  console.log('');
  console.log('🔍 Per verificare i log, vai su:');
  console.log('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/functions/create-booking/logs');
  console.log('   e cerca il booking ID:', booking.id);
}

checkBooking().catch((error) => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});



