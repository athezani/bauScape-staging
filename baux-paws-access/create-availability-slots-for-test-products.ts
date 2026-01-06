/**
 * Script per creare slot di disponibilità per i prodotti di test
 * Necessario per permettere le prenotazioni
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testProductIds = {
  class: 'c5b5dee3-0fe4-46a1-8df6-0029025140f7',
  experience: '3ad7de77-ad37-42dd-98cd-70c5d2d7dd87',
  trip: '82b9b92a-90df-4cde-a191-b29030f8dae8',
};

async function createAvailabilitySlots(productId: string, productType: 'class' | 'experience' | 'trip'): Promise<boolean> {
  console.log(`\n📅 Creando slot di disponibilità per ${productType} (${productId})...`);
  
  // Verifica se esistono già slot
  const { data: existingSlots, error: checkError } = await supabase
    .from('availability_slot')
    .select('id, date')
    .eq('product_id', productId)
    .eq('product_type', productType)
    .limit(5);
  
  if (checkError) {
    console.log(`   ⚠️  Errore nella verifica: ${checkError.message}`);
  }
  
  if (existingSlots && existingSlots.length > 0) {
    console.log(`   ✅ Trovati ${existingSlots.length} slot esistenti`);
    existingSlots.forEach(slot => {
      console.log(`      - ${slot.date} (${slot.id})`);
    });
    return true;
  }
  
  // Crea nuovi slot per i prossimi 7 giorni
  const slots = [];
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + i);
    const dateStr = slotDate.toISOString().split('T')[0];
    
    const slotData: any = {
      product_id: productId,
      product_type: productType,
      date: dateStr,
      max_adults: productType === 'trip' ? 10 : 8,
      max_dogs: productType === 'trip' ? 5 : 4,
      booked_adults: 0,
      booked_dogs: 0,
    };
    
    // Per class ed experience, aggiungi anche un time_slot
    if (productType === 'class' || productType === 'experience') {
      slotData.time_slot = productType === 'class' ? '09:00' : '08:30';
    }
    
    slots.push(slotData);
  }
  
  const { data: createdSlots, error: createError } = await supabase
    .from('availability_slot')
    .insert(slots)
    .select('id, date');
  
  if (createError) {
    console.log(`   ❌ Errore nella creazione: ${createError.message}`);
    return false;
  }
  
  if (createdSlots && createdSlots.length > 0) {
    console.log(`   ✅ Creati ${createdSlots.length} slot di disponibilità:`);
    createdSlots.forEach(slot => {
      console.log(`      - ${slot.date} (${slot.id})`);
    });
    return true;
  }
  
  return false;
}

async function main() {
  console.log('🚀 CREAZIONE SLOT DI DISPONIBILITÀ PER PRODOTTI DI TEST');
  console.log('='.repeat(70));
  
  const results: { type: string; success: boolean }[] = [];
  
  for (const [type, productId] of Object.entries(testProductIds)) {
    const success = await createAvailabilitySlots(productId, type as 'class' | 'experience' | 'trip');
    results.push({ type, success });
  }
  
  // Riepilogo
  console.log(`\n${'='.repeat(70)}`);
  console.log('RIEPILOGO');
  console.log('='.repeat(70));
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.type}: Slot creati`);
    } else {
      console.log(`❌ ${result.type}: Errore nella creazione`);
    }
  });
  
  const allSuccess = results.every(r => r.success);
  const successCount = results.filter(r => r.success).length;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Risultato: ${successCount}/${results.length} prodotti con slot`);
  console.log(`${allSuccess ? '✅ TUTTI GLI SLOT CREATI!' : '⚠️  ALCUNI SLOT NON CREATI'}`);
  console.log('='.repeat(70));
  
  if (allSuccess) {
    console.log('\n✅ I prodotti sono ora prenotabili!');
    console.log('   Puoi procedere con una prenotazione di test.');
  }
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

