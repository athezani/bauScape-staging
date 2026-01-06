/**
 * Test disponibilità slot per "Primo viaggio"
 * Verifica se il prodotto ha slot di disponibilità configurati
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const PRIMO_VIAGGIO_ID = 'bf3841c9-c927-427a-b1db-3cf933dbb450';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testProductAvailability() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Test Disponibilità "Primo viaggio"');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // 1. Verifica prodotto
  console.log('📋 Test 1: Verifica prodotto\n');
  const { data: product, error: productError } = await supabase
    .from('trip')
    .select('*')
    .eq('id', PRIMO_VIAGGIO_ID)
    .single();
  
  if (productError || !product) {
    console.log(`❌ Errore caricamento prodotto: ${productError?.message || 'Prodotto non trovato'}`);
    return;
  }
  
  console.log(`✅ Prodotto trovato: ${product.name}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Attivo: ${product.active ? 'Sì' : 'No'}`);
  console.log(`   Start date: ${product.start_date || 'NON IMPOSTATA'}`);
  console.log(`   Duration days: ${product.duration_days || 'NON IMPOSTATA'}`);
  console.log(`   Max adults: ${product.max_adults || 'NON IMPOSTATA'}`);
  console.log(`   Max dogs: ${product.max_dogs || 'NON IMPOSTATA'}`);
  console.log('');
  
  // 2. Verifica slot disponibilità
  console.log('📋 Test 2: Verifica slot disponibilità\n');
  const { data: slots, error: slotsError } = await supabase
    .from('availability_slot')
    .select('*')
    .eq('product_id', PRIMO_VIAGGIO_ID)
    .eq('product_type', 'trip');
  
  if (slotsError) {
    console.log(`❌ Errore caricamento slot: ${slotsError.message}`);
    return;
  }
  
  console.log(`📊 Slot trovati: ${slots?.length || 0}\n`);
  
  if (!slots || slots.length === 0) {
    console.log('❌ PROBLEMA: Nessuno slot di disponibilità trovato!');
    console.log('   Questo è il motivo per cui vedi "Il viaggio non è al momento disponibile"\n');
    
    // Suggerimenti
    console.log('💡 SOLUZIONE:');
    console.log('   1. Vai nel provider portal');
    console.log('   2. Apri il prodotto "Primo viaggio"');
    console.log('   3. Vai alla sezione "Disponibilità"');
    console.log('   4. Crea uno slot di disponibilità con:');
    console.log(`      - Data: ${product.start_date || 'data di inizio viaggio'}`);
    console.log(`      - Max adults: ${product.max_adults || 10}`);
    console.log(`      - Max dogs: ${product.max_dogs || 10}`);
    console.log('');
    
    // Verifica se il prodotto ha start_date
    if (!product.start_date) {
      console.log('⚠️  ATTENZIONE: Il prodotto non ha una start_date impostata!');
      console.log('   Imposta prima la start_date del viaggio nel provider portal.\n');
    }
    
    return;
  }
  
  // Slot trovati - verifica dettagli
  console.log('✅ Slot trovati:\n');
  slots.forEach((slot, idx) => {
    console.log(`   Slot ${idx + 1}:`);
    console.log(`      ID: ${slot.id}`);
    console.log(`      Data: ${slot.date}`);
    console.log(`      Max adults: ${slot.max_adults}`);
    console.log(`      Max dogs: ${slot.max_dogs}`);
    console.log(`      Booked adults: ${slot.booked_adults || 0}`);
    console.log(`      Booked dogs: ${slot.booked_dogs || 0}`);
    console.log(`      Disponibile: ${(slot.max_adults - (slot.booked_adults || 0)) > 0 ? 'Sì' : 'No'}`);
    console.log('');
  });
  
  // 3. Verifica query come nel frontend
  console.log('📋 Test 3: Simula query frontend (AvailabilitySelector)\n');
  
  // Query come in AvailabilitySelector - solo slot disponibili
  const today = new Date().toISOString().split('T')[0];
  const { data: availableSlots, error: availableError } = await supabase
    .from('availability_slot')
    .select('*')
    .eq('product_id', PRIMO_VIAGGIO_ID)
    .eq('product_type', 'trip')
    .gte('date', today) // Solo date future o oggi
    .order('date', { ascending: true });
  
  if (availableError) {
    console.log(`❌ Errore query slot disponibili: ${availableError.message}`);
    return;
  }
  
  console.log(`📊 Slot disponibili (date >= ${today}): ${availableSlots?.length || 0}\n`);
  
  if (!availableSlots || availableSlots.length === 0) {
    console.log('❌ PROBLEMA: Nessuno slot disponibile trovato con la query del frontend!');
    console.log('   Questo causa l\'errore "Il viaggio non è al momento disponibile"\n');
    
    // Verifica se gli slot esistono ma hanno date passate
    if (slots && slots.length > 0) {
      const pastSlots = slots.filter(s => s.date < today);
      if (pastSlots.length > 0) {
        console.log(`⚠️  Trovati ${pastSlots.length} slot con date passate:`);
        pastSlots.forEach(s => {
          console.log(`      - ${s.date} (passata)`);
        });
        console.log('\n💡 SOLUZIONE: Crea uno slot con una data futura o aggiorna le date esistenti.\n');
      }
    }
    
    return;
  }
  
  console.log('✅ Slot disponibili trovati:\n');
  availableSlots.forEach((slot, idx) => {
    const availableAdults = (slot.max_adults || 0) - (slot.booked_adults || 0);
    const availableDogs = (slot.max_dogs || 0) - (slot.booked_dogs || 0);
    
    console.log(`   Slot ${idx + 1}:`);
    console.log(`      Data: ${slot.date}`);
    console.log(`      Disponibilità: ${availableAdults} adulti, ${availableDogs} cani`);
    console.log(`      Stato: ${availableAdults > 0 ? '✅ Disponibile' : '❌ Esaurito'}`);
    console.log('');
  });
  
  console.log('✅ Il prodotto dovrebbe essere prenotabile!\n');
}

async function main() {
  await testProductAvailability();
}

main().catch(console.error);



