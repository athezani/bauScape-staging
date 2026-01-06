/**
 * Script per applicare il fix ENUM automaticamente
 * Usa Supabase client per eseguire SQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY deve essere impostata');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyFix() {
  console.log('🔧 Applicazione fix ENUM product_type...');
  console.log('');

  try {
    // Leggi il file SQL
    const sql = readFileSync('fix-product-type-enum.sql', 'utf-8');
    
    // Supabase non ha un endpoint diretto per eseguire SQL arbitrario
    // Dobbiamo usare una funzione RPC o eseguire direttamente
    // Per ora, mostriamo le istruzioni
    
    console.log('⚠️  Supabase non permette esecuzione SQL arbitrario via API REST');
    console.log('');
    console.log('📋 Applica il fix manualmente:');
    console.log('');
    console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('2. Apri il file: fix-product-type-enum.sql');
    console.log('3. Copia tutto il contenuto');
    console.log('4. Incolla nel SQL Editor');
    console.log('5. Esegui');
    console.log('');
    console.log('Oppure, se preferisci, posso provare a eseguire i test dopo che hai applicato il fix.');
    console.log('');
    
    // Prova comunque a eseguire i test per vedere se il fix è già stato applicato
    console.log('🧪 Test rapido per verificare se il fix è già applicato...');
    console.log('');
    
    // Test con un booking di prova
    const testIdempotencyKey = 'test-fix-enum-' + Date.now();
    const { data: result, error } = await supabase.rpc('create_booking_transactional', {
      p_idempotency_key: testIdempotencyKey,
      p_product_type: 'experience',
      p_provider_id: '00000000-0000-0000-0000-000000000000', // Dummy, fallirà ma vediamo l'errore
      p_availability_slot_id: null,
      p_stripe_checkout_session_id: 'cs_test_fix',
      p_stripe_payment_intent_id: null,
      p_order_number: 'TESTFIX',
      p_booking_date: new Date().toISOString().split('T')[0],
      p_booking_time: new Date().toISOString(),
      p_number_of_adults: 1,
      p_number_of_dogs: 0,
      p_total_amount_paid: 10.00,
      p_customer_email: 'test@example.com',
      p_customer_name: 'Test',
      p_product_name: 'Test',
    });

    if (error) {
      if (error.message.includes('product_type') && error.message.includes('type text')) {
        console.log('❌ Fix NON ancora applicato - errore ENUM ancora presente');
        console.log('   Errore:', error.message);
        console.log('');
        console.log('📋 Applica fix-product-type-enum.sql nel SQL Editor');
      } else {
        console.log('✅ Fix sembra applicato (errore diverso dall\'ENUM)');
        console.log('   Errore:', error.message);
      }
    } else {
      console.log('✅ Fix applicato! Funzione funziona correttamente');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

applyFix();




