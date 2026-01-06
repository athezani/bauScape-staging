/**
 * Test End-to-End: Trip Booking Flow
 * 
 * Questo script testa il flusso completo di booking per un trip:
 * 1. Verifica che il trip esista e sia attivo
 * 2. Verifica che ci siano slot disponibili
 * 3. Simula la logica di handleBooking per vedere se trova lo slot
 * 4. Verifica che lo slot possa essere usato per il checkout
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ ERRORE: NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY non configurato');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTripBookingFlow(tripId: string) {
  console.log(`\n🧪 Testing trip booking flow for trip: ${tripId}`);
  console.log('='.repeat(60));

  // Step 1: Load trip data
  console.log('\n📋 Step 1: Loading trip data...');
  const { data: tripData, error: tripError } = await supabase
    .from('trip')
    .select('id, name, active, start_date, end_date, duration_days, cutoff_hours')
    .eq('id', tripId)
    .single();

  if (tripError) {
    console.error('❌ Error loading trip:', tripError);
    return false;
  }

  if (!tripData) {
    console.error('❌ Trip not found');
    return false;
  }

  console.log('✅ Trip data loaded:', {
    name: tripData.name,
    active: tripData.active,
    start_date: tripData.start_date,
    end_date: tripData.end_date,
    duration_days: tripData.duration_days,
    cutoff_hours: tripData.cutoff_hours
  });

  // Step 2: Check if trip is active
  console.log('\n📋 Step 2: Checking if trip is active...');
  if (!tripData.active) {
    console.error('❌ Trip is not active');
    return false;
  }
  console.log('✅ Trip is active');

  // Step 3: Check if trip has ended
  console.log('\n📋 Step 3: Checking if trip has ended...');
  const today = new Date().toISOString().split('T')[0];
  if (tripData.end_date && tripData.end_date < today) {
    console.error('❌ Trip has ended:', {
      end_date: tripData.end_date,
      today
    });
    return false;
  }
  console.log('✅ Trip has not ended');

  // Step 4: Load slots (without filters, like handleBooking fallback)
  console.log('\n📋 Step 4: Loading slots (like handleBooking fallback)...');
  let slotsQuery = supabase
    .from('availability_slot')
    .select('id, date, time_slot, max_adults, max_dogs, booked_adults, booked_dogs')
    .eq('product_id', tripId)
    .eq('product_type', 'trip')
    .order('date', { ascending: true })
    .limit(1);

  // Only filter by future date if trip hasn't started yet
  if (tripData.start_date && tripData.start_date >= today) {
    slotsQuery = slotsQuery.gte('date', today);
  }

  const { data: slots, error: slotsError } = await slotsQuery;

  if (slotsError) {
    console.error('❌ Error loading slots:', slotsError);
    return false;
  }

  console.log('✅ Slots query executed:', {
    slotsCount: slots?.length || 0,
    slots: slots?.map(s => ({
      id: s.id,
      date: s.date,
      time_slot: s.time_slot,
      availableAdults: (s.max_adults || 0) - (s.booked_adults || 0),
      availableDogs: (s.max_dogs || 0) - (s.booked_dogs || 0)
    }))
  });

  if (!slots || slots.length === 0) {
    console.error('❌ No slots found - this is why booking fails!');
    return false;
  }

  // Step 5: Check slot capacity (like AvailabilitySelector does)
  console.log('\n📋 Step 5: Checking slot capacity (like AvailabilitySelector filter)...');
  const tripSlot = slots[0];
  const availableAdults = (tripSlot.max_adults || 0) - (tripSlot.booked_adults || 0);
  const availableDogs = (tripSlot.max_dogs || 0) - (tripSlot.booked_dogs || 0);

  console.log('Slot capacity:', {
    max_adults: tripSlot.max_adults,
    booked_adults: tripSlot.booked_adults,
    availableAdults,
    max_dogs: tripSlot.max_dogs,
    booked_dogs: tripSlot.booked_dogs,
    availableDogs
  });

  // Step 6: Check cutoff time (like AvailabilitySelector does)
  console.log('\n📋 Step 6: Checking cutoff time (like AvailabilitySelector filter)...');
  if (tripData.cutoff_hours && tripData.cutoff_hours > 0) {
    const now = new Date();
    const slotDate = new Date(tripSlot.date);
    const slotTime = tripSlot.time_slot ? tripSlot.time_slot.split(':') : [0, 0];
    slotDate.setHours(parseInt(slotTime[0]), parseInt(slotTime[1]), 0, 0);
    
    const cutoffTime = new Date(now.getTime() + tripData.cutoff_hours * 60 * 60 * 1000);
    
    console.log('Cutoff check:', {
      slotDateTime: slotDate.toISOString(),
      cutoffTime: cutoffTime.toISOString(),
      now: now.toISOString(),
      cutoff_hours: tripData.cutoff_hours,
      isAfterCutoff: slotDate > cutoffTime
    });

    if (slotDate <= cutoffTime) {
      console.error('❌ Slot is too late to book (cutoff time)');
      console.log('   This is why AvailabilitySelector filters it out!');
      return false;
    }
  }
  console.log('✅ Slot passes cutoff time check');

  // Step 7: Final check
  console.log('\n📋 Step 7: Final check...');
  if (availableAdults < 1 || availableDogs < 1) {
    console.error('❌ Slot has insufficient capacity');
    return false;
  }

  console.log('✅ Trip booking flow should work!');
  console.log('\n📊 Summary:');
  console.log('  - Trip is active:', tripData.active);
  console.log('  - Trip has not ended:', !tripData.end_date || tripData.end_date >= today);
  console.log('  - Slot found:', !!slots && slots.length > 0);
  console.log('  - Slot has capacity:', availableAdults >= 1 && availableDogs >= 1);
  console.log('  - Slot passes cutoff:', true);

  return true;
}

async function main() {
  const tripId = Deno.args[0];
  
  if (!tripId) {
    console.error('❌ Usage: deno run --allow-net --allow-env test-trip-booking-flow.ts <trip-id>');
    console.log('\nTo find a trip ID, run:');
    console.log('  deno run --allow-net --allow-env test-trip-checkout-always-works.ts');
    Deno.exit(1);
  }

  const success = await testTripBookingFlow(tripId);
  
  if (success) {
    console.log('\n✅ Test passed! Booking should work for this trip.');
    Deno.exit(0);
  } else {
    console.log('\n❌ Test failed! Booking will not work for this trip.');
    Deno.exit(1);
  }
}

main();

