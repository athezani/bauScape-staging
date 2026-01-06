/**
 * Script per verificare quali parametri vengono effettivamente inviati a Brevo
 * per una prenotazione specifica
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkBookingEmailParams(bookingId?: string) {
  console.log('🔍 VERIFICA PARAMETRI EMAIL\n');
  
  // Se non viene fornito un bookingId, trova l'ultimo booking
  let booking;
  
  if (bookingId) {
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (error || !data) {
      console.error('❌ Booking non trovato:', bookingId);
      return;
    }
    booking = data;
  } else {
    // Trova l'ultimo booking
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      console.error('❌ Nessun booking trovato');
      return;
    }
    booking = data;
  }
  
  console.log('📦 Booking trovato:');
  console.log('   ID:', booking.id);
  console.log('   Product:', booking.product_name);
  console.log('   Product Type:', booking.product_type);
  console.log('   Product ID:', booking.product_id);
  console.log('   Availability Slot ID:', booking.availability_slot_id);
  console.log('');
  
  // Determina il nome della tabella
  const tableName = booking.product_type === 'experience' ? 'experience' : 
                   booking.product_type === 'class' ? 'class' : 'trip';
  
  // Recupera product_id dal booking o dall'availability_slot
  let productId = booking.product_id;
  
  if (!productId && booking.availability_slot_id) {
    console.log('   🔍 Product ID non trovato nel booking, recupero da availability_slot...');
    const { data: slot, error: slotError } = await supabase
      .from('availability_slot')
      .select('product_id')
      .eq('id', booking.availability_slot_id)
      .single();
    
    if (!slotError && slot) {
      productId = slot.product_id;
      console.log('   ✅ Product ID recuperato da slot:', productId);
    }
  }
  
  if (!productId) {
    console.log('   ⚠️  Product ID non trovato, cerco per nome prodotto...');
    // Cerca il prodotto per nome
    const { data: products, error: searchError } = await supabase
      .from(tableName)
      .select('id, name, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
      .eq('name', booking.product_name)
      .eq('active', true)
      .limit(1);
    
    if (searchError || !products || products.length === 0) {
      console.error('❌ Prodotto non trovato per nome:', booking.product_name);
      return;
    }
    
    productId = products[0].id;
    console.log('   ✅ Prodotto trovato per nome, ID:', productId);
    
    // Usa i dati del prodotto trovato
    const product = products[0];
    
    console.log('📋 Dati prodotto recuperati:');
    console.log('   Included items:', product.included_items);
    console.log('   Included items type:', typeof product.included_items);
    console.log('   Included items is array:', Array.isArray(product.included_items));
    console.log('   Included items length:', Array.isArray(product.included_items) ? product.included_items.length : 0);
    console.log('');
    console.log('   Excluded items:', product.excluded_items);
    console.log('   Excluded items type:', typeof product.excluded_items);
    console.log('   Excluded items is array:', Array.isArray(product.excluded_items));
    console.log('   Excluded items length:', Array.isArray(product.excluded_items) ? product.excluded_items.length : 0);
    console.log('');
    console.log('   Meeting info:', product.meeting_info);
    console.log('   Show meeting info:', product.show_meeting_info);
    console.log('   Cancellation policy:', product.cancellation_policy ? 'Presente' : 'Assente');
    console.log('');
    
    // Simula la formattazione
    const includedItems = Array.isArray(product.included_items) ? product.included_items : undefined;
    const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : undefined;
    
    const includedItemsHtml = includedItems && includedItems.length > 0
      ? includedItems.map(item => `<table>...</table>`).join('')
      : '';
    const excludedItemsHtml = excludedItems && excludedItems.length > 0
      ? excludedItems.map(item => `<table>...</table>`).join('')
      : '';
    
    console.log('📊 Parametri che verrebbero inviati a Brevo:');
    console.log('   INCLUDED_ITEMS:', includedItemsHtml ? `HTML (${includedItemsHtml.length} chars)` : 'EMPTY');
    console.log('   INCLUDED_ITEMS_DISPLAY:', includedItemsHtml ? 'block' : 'none');
    console.log('   EXCLUDED_ITEMS:', excludedItemsHtml ? `HTML (${excludedItemsHtml.length} chars)` : 'EMPTY');
    console.log('   EXCLUDED_ITEMS_DISPLAY:', excludedItemsHtml ? 'block' : 'none');
    console.log('');
    
    if (!includedItemsHtml && !excludedItemsHtml) {
      console.log('⚠️  PROBLEMA: Nessun included/excluded items da mostrare!');
      console.log('   Verifica che il prodotto abbia i campi compilati nel database.');
    } else {
      console.log('✅ I dati sono presenti e verrebbero inviati correttamente.');
      console.log('   Se le sezioni non appaiono nell\'email, il problema è nel template Brevo.');
    }
    return;
  }
  
  // Recupera i dati del prodotto
  const { data: product, error: productError } = await supabase
    .from(tableName)
    .select('included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy')
    .eq('id', productId)
    .single();
  
  if (productError || !product) {
    console.error('❌ Prodotto non trovato:', booking.product_id);
    return;
  }
  
  console.log('📋 Dati prodotto recuperati:');
  console.log('   Included items:', product.included_items);
  console.log('   Included items type:', typeof product.included_items);
  console.log('   Included items is array:', Array.isArray(product.included_items));
  console.log('   Included items length:', Array.isArray(product.included_items) ? product.included_items.length : 0);
  console.log('');
  console.log('   Excluded items:', product.excluded_items);
  console.log('   Excluded items type:', typeof product.excluded_items);
  console.log('   Excluded items is array:', Array.isArray(product.excluded_items));
  console.log('   Excluded items length:', Array.isArray(product.excluded_items) ? product.excluded_items.length : 0);
  console.log('');
  console.log('   Meeting info:', product.meeting_info);
  console.log('   Show meeting info:', product.show_meeting_info);
  console.log('   Cancellation policy:', product.cancellation_policy ? 'Presente' : 'Assente');
  console.log('');
  
  // Simula la formattazione
  const includedItems = Array.isArray(product.included_items) ? product.included_items : undefined;
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : undefined;
  
  const includedItemsHtml = includedItems && includedItems.length > 0
    ? includedItems.map(item => `<table>...</table>`).join('')
    : '';
  const excludedItemsHtml = excludedItems && excludedItems.length > 0
    ? excludedItems.map(item => `<table>...</table>`).join('')
    : '';
  
  console.log('📊 Parametri che verrebbero inviati a Brevo:');
  console.log('   INCLUDED_ITEMS:', includedItemsHtml ? `HTML (${includedItemsHtml.length} chars)` : 'EMPTY');
  console.log('   INCLUDED_ITEMS_DISPLAY:', includedItemsHtml ? 'block' : 'none');
  console.log('   EXCLUDED_ITEMS:', excludedItemsHtml ? `HTML (${excludedItemsHtml.length} chars)` : 'EMPTY');
  console.log('   EXCLUDED_ITEMS_DISPLAY:', excludedItemsHtml ? 'block' : 'none');
  console.log('');
  
  if (!includedItemsHtml && !excludedItemsHtml) {
    console.log('⚠️  PROBLEMA: Nessun included/excluded items da mostrare!');
    console.log('   Verifica che il prodotto abbia i campi compilati nel database.');
  } else {
    console.log('✅ I dati sono presenti e verrebbero inviati correttamente.');
    console.log('   Se le sezioni non appaiono nell\'email, il problema è nel template Brevo.');
  }
}

// Esegui il check
const bookingId = Deno.args[0];
checkBookingEmailParams(bookingId).catch(console.error);

