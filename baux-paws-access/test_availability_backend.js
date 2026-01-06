/**
 * Test Script per Sistema Disponibilità - Backend
 * Esegue tutti i test delle funzionalità backend
 * 
 * Uso: node test_availability_backend.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica variabili d'ambiente
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_tVK70OrNKiaVmttm2WxyXA_tMFn9bUc';

const supabase = createClient(supabaseUrl, supabaseKey);

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : type === 'warn' ? '⚠' : '•';
  console.log(`${prefix} ${message}`);
  if (type === 'pass') results.passed.push(message);
  else if (type === 'fail') results.failed.push(message);
  else if (type === 'warn') results.warnings.push(message);
}

async function test1_VerifyDatabaseStructure() {
  console.log('\n========================================');
  console.log('TEST 1: Verifica struttura database');
  console.log('========================================');

  try {
    // Verifica tabella availability_slot
    const { error: slotError } = await supabase
      .from('availability_slot')
      .select('id')
      .limit(1);

    if (slotError && slotError.code === '42P01') {
      log('Tabella availability_slot NON esiste', 'fail');
      return false;
    }
    log('Tabella availability_slot esiste', 'pass');

    // Verifica campi nelle tabelle prodotto
    const { data: expData, error: expError } = await supabase
      .from('experience')
      .select('active, cutoff_hours')
      .limit(1);

    if (expError) {
      log(`Errore verifica experience: ${expError.message}`, 'fail');
      return false;
    }
    if (expData && expData.length > 0) {
      log('Campi active e cutoff_hours presenti in experience', 'pass');
    }

    // Verifica campo availability_slot_id in booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('booking')
      .select('availability_slot_id')
      .limit(1);

    if (bookingError && bookingError.code !== 'PGRST116') { // PGRST116 = no rows
      log(`Errore verifica booking: ${bookingError.message}`, 'fail');
      return false;
    }
    log('Campo availability_slot_id presente in booking', 'pass');

    return true;
  } catch (error) {
    log(`Errore TEST 1: ${error.message}`, 'fail');
    return false;
  }
}

async function test2_CreateAvailabilitySlots() {
  console.log('\n========================================');
  console.log('TEST 2: Creazione availability slots');
  console.log('========================================');

  try {
    // Trova prodotti esistenti
    const { data: experiences } = await supabase
      .from('experience')
      .select('id')
      .limit(1);

    if (!experiences || experiences.length === 0) {
      log('Nessun experience trovato per i test', 'warn');
      return false;
    }

    const expId = experiences[0].id;
    log(`Trovato experience con ID: ${expId}`, 'info');

    // Crea slot con time slot
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    const { data: slot1, error: error1 } = await supabase
      .from('availability_slot')
      .insert({
        product_id: expId,
        product_type: 'experience',
        date: dateStr,
        time_slot: '10:00:00',
        end_time: '13:00:00',
        max_adults: 10,
        max_dogs: 5,
        booked_adults: 0,
        booked_dogs: 0
      })
      .select()
      .single();

    if (error1) {
      log(`Errore creazione slot 1: ${error1.message}`, 'fail');
      return false;
    }
    log(`Creato availability slot con time slot: ${slot1.id}`, 'pass');

    // Crea slot full-day
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr2 = futureDate.toISOString().split('T')[0];

    const { data: slot2, error: error2 } = await supabase
      .from('availability_slot')
      .insert({
        product_id: expId,
        product_type: 'experience',
        date: dateStr2,
        time_slot: null,
        end_time: null,
        max_adults: 15,
        max_dogs: 10,
        booked_adults: 0,
        booked_dogs: 0
      })
      .select()
      .single();

    if (error2) {
      log(`Errore creazione slot 2: ${error2.message}`, 'fail');
      return false;
    }
    log(`Creato availability slot full-day: ${slot2.id}`, 'pass');

    return true;
  } catch (error) {
    log(`Errore TEST 2: ${error.message}`, 'fail');
    return false;
  }
}

async function test3_VerifySlotsCreated() {
  console.log('\n========================================');
  console.log('TEST 3: Verifica creazione slots');
  console.log('========================================');

  try {
    const { data: slots, error } = await supabase
      .from('availability_slot')
      .select('product_type, time_slot');

    if (error) {
      log(`Errore query slots: ${error.message}`, 'fail');
      return false;
    }

    const total = slots.length;
    const withTimeSlots = slots.filter(s => s.time_slot !== null).length;
    const fullDay = slots.filter(s => s.time_slot === null).length;

    log(`Total slots: ${total}`, 'info');
    log(`Slots con time slots: ${withTimeSlots}`, 'info');
    log(`Full-day slots: ${fullDay}`, 'info');

    if (total > 0) {
      log('Slots creati correttamente', 'pass');
      return true;
    } else {
      log('Nessuno slot trovato', 'fail');
      return false;
    }
  } catch (error) {
    log(`Errore TEST 3: ${error.message}`, 'fail');
    return false;
  }
}

async function test4_SetCutoffHours() {
  console.log('\n========================================');
  console.log('TEST 4: Impostazione cutoff_hours e active');
  console.log('========================================');

  try {
    const { data: experiences } = await supabase
      .from('experience')
      .select('id')
      .limit(1);

    if (!experiences || experiences.length === 0) {
      log('Nessun experience trovato', 'warn');
      return false;
    }

    const expId = experiences[0].id;

    const { error } = await supabase
      .from('experience')
      .update({ cutoff_hours: 24, active: true })
      .eq('id', expId);

    if (error) {
      log(`Errore aggiornamento: ${error.message}`, 'fail');
      return false;
    }

    // Verifica
    const { data: updated } = await supabase
      .from('experience')
      .select('cutoff_hours, active')
      .eq('id', expId)
      .single();

    if (updated && updated.cutoff_hours === 24 && updated.active === true) {
      log('cutoff_hours e active impostati correttamente', 'pass');
      return true;
    } else {
      log('cutoff_hours o active non impostati correttamente', 'fail');
      return false;
    }
  } catch (error) {
    log(`Errore TEST 4: ${error.message}`, 'fail');
    return false;
  }
}

async function test5_BookingTriggers() {
  console.log('\n========================================');
  console.log('TEST 5: Creazione booking e aggiornamento contatori');
  console.log('========================================');

  try {
    // Trova uno slot disponibile
    const { data: slots } = await supabase
      .from('availability_slot')
      .select('*')
      .lt('booked_adults', supabase.raw('max_adults'))
      .lt('booked_dogs', supabase.raw('max_dogs'))
      .limit(1);

    if (!slots || slots.length === 0) {
      log('Nessuno slot disponibile trovato', 'warn');
      return false;
    }

    const slot = slots[0];
    const bookedBefore = slot.booked_adults;

    log(`Contatori PRIMA: adults=${bookedBefore}, dogs=${slot.booked_dogs}`, 'info');

    // Trova un provider
    const { data: providers } = await supabase
      .from('profile')
      .select('id')
      .limit(1);

    if (!providers || providers.length === 0) {
      log('Nessun provider trovato', 'warn');
      return false;
    }

    const providerId = providers[0].id;

    // Crea booking
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .insert({
        provider_id: providerId,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        product_name: 'Test Product',
        product_type: 'experience',
        booking_date: slot.date,
        booking_time: slot.time_slot,
        number_of_adults: 2,
        number_of_dogs: 1,
        availability_slot_id: slot.id,
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      log(`Errore creazione booking: ${bookingError.message}`, 'fail');
      return false;
    }

    log(`Creato booking: ${booking.id}`, 'info');

    // Attendi un momento per il trigger
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verifica contatori dopo booking
    const { data: updatedSlot } = await supabase
      .from('availability_slot')
      .select('booked_adults, booked_dogs')
      .eq('id', slot.id)
      .single();

    if (updatedSlot && updatedSlot.booked_adults === bookedBefore + 2) {
      log('TRIGGER FUNZIONA: booked_adults incrementato correttamente', 'pass');
    } else {
      log(`TRIGGER ERRORE: booked_adults dovrebbe essere ${bookedBefore + 2} ma è ${updatedSlot?.booked_adults}`, 'fail');
    }

    // Test cancellazione
    const { error: cancelError } = await supabase
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('id', booking.id);

    if (cancelError) {
      log(`Errore cancellazione: ${cancelError.message}`, 'fail');
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: finalSlot } = await supabase
        .from('availability_slot')
        .select('booked_adults')
        .eq('id', slot.id)
        .single();

      if (finalSlot && finalSlot.booked_adults === bookedBefore) {
        log('TRIGGER CANCELLAZIONE FUNZIONA: booked_adults decrementato correttamente', 'pass');
      } else {
        log(`TRIGGER CANCELLAZIONE ERRORE: booked_adults dovrebbe essere ${bookedBefore}`, 'fail');
      }
    }

    // Pulisci
    await supabase.from('booking').delete().eq('id', booking.id);
    log('Booking di test eliminato', 'info');

    return true;
  } catch (error) {
    log(`Errore TEST 5: ${error.message}`, 'fail');
    return false;
  }
}

async function test6_RLSPolicies() {
  console.log('\n========================================');
  console.log('TEST 6: Verifica RLS policies');
  console.log('========================================');

  try {
    // Test lettura pubblica (anon)
    const { data: publicData, error: publicError } = await supabase
      .from('experience')
      .select('id')
      .limit(1);

    if (publicError) {
      log(`RLS Policy ERRORE: ${publicError.message}`, 'fail');
      return false;
    }

    log('RLS Policy: Lettura pubblica funziona', 'pass');

    // Test lettura availability_slot
    const { data: slotData, error: slotError } = await supabase
      .from('availability_slot')
      .select('id')
      .limit(1);

    if (slotError) {
      log(`RLS Policy availability_slot ERRORE: ${slotError.message}`, 'fail');
      return false;
    }

    log('RLS Policy: Lettura availability_slot funziona', 'pass');

    return true;
  } catch (error) {
    log(`Errore TEST 6: ${error.message}`, 'fail');
    return false;
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('TEST SISTEMA DISPONIBILITÀ - BACKEND');
  console.log('========================================');

  await test1_VerifyDatabaseStructure();
  await test2_CreateAvailabilitySlots();
  await test3_VerifySlotsCreated();
  await test4_SetCutoffHours();
  await test5_BookingTriggers();
  await test6_RLSPolicies();

  console.log('\n========================================');
  console.log('RIEPILOGO TEST');
  console.log('========================================');
  console.log(`✓ Test passati: ${results.passed.length}`);
  console.log(`✗ Test falliti: ${results.failed.length}`);
  console.log(`⚠ Warning: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\nTest falliti:');
    results.failed.forEach(msg => console.log(`  - ${msg}`));
  }

  if (results.passed.length > 0) {
    console.log('\nTest passati:');
    results.passed.forEach(msg => console.log(`  - ${msg}`));
  }

  console.log('\n========================================');
  if (results.failed.length === 0) {
    console.log('✓ TUTTI I TEST SONO PASSATI!');
  } else {
    console.log('✗ Alcuni test sono falliti. Verifica gli errori sopra.');
  }
  console.log('========================================');
}

runAllTests().catch(console.error);




