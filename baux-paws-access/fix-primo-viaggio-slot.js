/**
 * Fix slot disponibilità per "Primo viaggio"
 * Aggiorna la data dello slot alla start_date del prodotto
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const PRIMO_VIAGGIO_ID = 'bf3841c9-c927-427a-b1db-3cf933dbb450';
const SLOT_ID = '5c2e0cba-2e52-4e69-9d58-4d845a626697';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixSlot() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Fix Slot Disponibilità "Primo viaggio"');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // 1. Carica prodotto per ottenere start_date
  console.log('📋 Caricamento prodotto...\n');
  const { data: product, error: productError } = await supabase
    .from('trip')
    .select('start_date, duration_days')
    .eq('id', PRIMO_VIAGGIO_ID)
    .single();
  
  if (productError || !product) {
    console.log(`❌ Errore: ${productError?.message || 'Prodotto non trovato'}`);
    return;
  }
  
  if (!product.start_date) {
    console.log('❌ Errore: Il prodotto non ha una start_date impostata!');
    console.log('   Imposta prima la start_date nel provider portal.\n');
    return;
  }
  
  console.log(`✅ Prodotto trovato`);
  console.log(`   Start date: ${product.start_date}`);
  console.log(`   Duration: ${product.duration_days} giorni\n`);
  
  // 2. Carica slot corrente
  console.log('📋 Caricamento slot corrente...\n');
  const { data: currentSlot, error: slotError } = await supabase
    .from('availability_slot')
    .select('*')
    .eq('id', SLOT_ID)
    .single();
  
  if (slotError || !currentSlot) {
    console.log(`❌ Errore: ${slotError?.message || 'Slot non trovato'}`);
    return;
  }
  
  console.log(`✅ Slot corrente trovato`);
  console.log(`   Data attuale: ${currentSlot.date}`);
  console.log(`   Max adults: ${currentSlot.max_adults}`);
  console.log(`   Max dogs: ${currentSlot.max_dogs}`);
  console.log(`   Booked adults: ${currentSlot.booked_adults || 0}`);
  console.log(`   Booked dogs: ${currentSlot.booked_dogs || 0}\n`);
  
  // 3. Verifica se la data deve essere aggiornata
  const today = new Date().toISOString().split('T')[0];
  const productDate = product.start_date.split('T')[0];
  
  if (currentSlot.date >= today) {
    console.log(`✅ La data dello slot (${currentSlot.date}) è già futura o oggi`);
    console.log(`   Non è necessario aggiornare.\n`);
    return;
  }
  
  console.log(`⚠️  La data dello slot (${currentSlot.date}) è passata`);
  console.log(`   Aggiornamento a: ${productDate}\n`);
  
  // 4. Aggiorna slot
  console.log('📋 Aggiornamento slot...\n');
  const { data: updatedSlot, error: updateError } = await supabase
    .from('availability_slot')
    .update({
      date: productDate,
    })
    .eq('id', SLOT_ID)
    .select()
    .single();
  
  if (updateError) {
    console.log(`❌ Errore aggiornamento: ${updateError.message}`);
    return;
  }
  
  console.log(`✅ Slot aggiornato con successo!`);
  console.log(`   Nuova data: ${updatedSlot.date}`);
  console.log(`   Max adults: ${updatedSlot.max_adults}`);
  console.log(`   Max dogs: ${updatedSlot.max_dogs}\n`);
  
  // 5. Verifica che ora sia disponibile
  console.log('📋 Verifica disponibilità...\n');
  const { data: availableSlots, error: verifyError } = await supabase
    .from('availability_slot')
    .select('*')
    .eq('product_id', PRIMO_VIAGGIO_ID)
    .eq('product_type', 'trip')
    .gte('date', today)
    .order('date', { ascending: true });
  
  if (verifyError) {
    console.log(`⚠️  Errore verifica: ${verifyError.message}`);
  } else {
    console.log(`✅ Slot disponibili trovati: ${availableSlots?.length || 0}`);
    if (availableSlots && availableSlots.length > 0) {
      console.log(`   Il prodotto dovrebbe ora essere prenotabile! 🎉\n`);
    }
  }
}

async function main() {
  await fixSlot();
}

main().catch(console.error);



