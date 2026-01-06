/**
 * Add availability slots for all active products from March 2026 onwards
 * This script creates availability for placeholder products
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.test.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Product {
  id: string;
  name: string;
  type: 'experience' | 'class' | 'trip';
  duration_hours?: number;
  duration_days?: number;
  max_adults?: number;
  max_dogs?: number;
}

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00'
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDates(startDate: Date, endDate: Date, count: number): Date[] {
  const dates: Date[] = [];
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const range = endTime - startTime;
  
  for (let i = 0; i < count; i++) {
    const randomTime = startTime + Math.random() * range;
    dates.push(new Date(randomTime));
  }
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationHours * 60;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

async function fetchAllActiveProducts(): Promise<Product[]> {
  const products: Product[] = [];
  
  // Fetch experiences
  console.log('Fetching active experiences...');
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name, duration_hours, max_adults, max_dogs')
    .eq('active', true);
  
  if (expError) {
    console.error('Error fetching experiences:', expError);
  } else if (experiences) {
    products.push(...experiences.map(exp => ({
      ...exp,
      type: 'experience' as const,
      max_adults: exp.max_adults || 10,
      max_dogs: exp.max_dogs || 5
    })));
    console.log(`Found ${experiences.length} active experiences`);
  }
  
  // Fetch classes
  console.log('Fetching active classes...');
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name, duration_hours, max_adults, max_dogs')
    .eq('active', true);
  
  if (classError) {
    console.error('Error fetching classes:', classError);
  } else if (classes) {
    products.push(...classes.map(cls => ({
      ...cls,
      type: 'class' as const,
      max_adults: cls.max_adults || 10,
      max_dogs: cls.max_dogs || 5
    })));
    console.log(`Found ${classes.length} active classes`);
  }
  
  // Fetch trips
  console.log('Fetching active trips...');
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, duration_days, max_adults, max_dogs')
    .eq('active', true);
  
  if (tripError) {
    console.error('Error fetching trips:', tripError);
  } else if (trips) {
    products.push(...trips.map(trip => ({
      ...trip,
      type: 'trip' as const,
      max_adults: trip.max_adults || 10,
      max_dogs: trip.max_dogs || 5
    })));
    console.log(`Found ${trips.length} active trips`);
  }
  
  return products;
}

async function deleteExistingFutureSlots(productId: string, productType: string): Promise<void> {
  const { error } = await supabase
    .from('availability_slot')
    .delete()
    .eq('product_id', productId)
    .eq('product_type', productType)
    .gte('date', '2026-03-01');
  
  if (error) {
    console.error(`Error deleting existing slots for ${productId}:`, error);
  }
}

async function createAvailabilityForProduct(product: Product): Promise<number> {
  console.log(`\n📅 Creating availability for ${product.type}: ${product.name} (${product.id})`);
  
  // Delete existing future slots first
  await deleteExistingFutureSlots(product.id, product.type);
  
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-12-31');
  
  // Generate 30-50 random dates
  const numDates = getRandomInt(30, 50);
  const dates = generateDates(startDate, endDate, numDates);
  
  const slotsToInsert: any[] = [];
  
  for (const date of dates) {
    const dateStr = formatDate(date);
    
    if (product.type === 'trip') {
      // Trips: only full-day slots
      slotsToInsert.push({
        product_id: product.id,
        product_type: product.type,
        date: dateStr,
        time_slot: null,
        end_time: null,
        max_adults: product.max_adults || 10,
        max_dogs: product.max_dogs || 5,
        booked_adults: 0,
        booked_dogs: 0
      });
    } else {
      // Experiences and Classes: mix of time slots and full-day
      const useTimeSlots = Math.random() > 0.3; // 70% have time slots
      
      if (useTimeSlots) {
        // Create 2-4 time slots for this day
        const numSlots = getRandomInt(2, 4);
        const selectedSlots: string[] = [];
        
        for (let i = 0; i < numSlots; i++) {
          let timeSlot = getRandomElement(TIME_SLOTS);
          while (selectedSlots.includes(timeSlot)) {
            timeSlot = getRandomElement(TIME_SLOTS);
          }
          selectedSlots.push(timeSlot);
          
          const durationHours = product.duration_hours || 2;
          const endTime = calculateEndTime(timeSlot, durationHours);
          
          slotsToInsert.push({
            product_id: product.id,
            product_type: product.type,
            date: dateStr,
            time_slot: timeSlot,
            end_time: endTime,
            max_adults: product.max_adults || 10,
            max_dogs: product.max_dogs || 5,
            booked_adults: 0,
            booked_dogs: 0
          });
        }
      } else {
        // Full-day slot
        slotsToInsert.push({
          product_id: product.id,
          product_type: product.type,
          date: dateStr,
          time_slot: null,
          end_time: null,
          max_adults: product.max_adults || 10,
          max_dogs: product.max_dogs || 5,
          booked_adults: 0,
          booked_dogs: 0
        });
      }
    }
  }
  
  // Insert in batches of 100
  let totalInserted = 0;
  for (let i = 0; i < slotsToInsert.length; i += 100) {
    const batch = slotsToInsert.slice(i, i + 100);
    const { error, count } = await supabase
      .from('availability_slot')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`  ❌ Error inserting batch for ${product.name}:`, error);
    } else {
      totalInserted += batch.length;
      console.log(`  ✅ Inserted ${batch.length} slots (total: ${totalInserted}/${slotsToInsert.length})`);
    }
  }
  
  return totalInserted;
}

async function main() {
  console.log('🚀 Starting availability generation for all products...\n');
  console.log('📆 Period: March 2026 - December 2026\n');
  
  // Fetch all products
  const products = await fetchAllActiveProducts();
  console.log(`\n📊 Total active products found: ${products.length}`);
  
  if (products.length === 0) {
    console.log('No active products found. Exiting.');
    return;
  }
  
  // Create availability for each product
  let totalSlots = 0;
  let successCount = 0;
  
  for (const product of products) {
    try {
      const slots = await createAvailabilityForProduct(product);
      totalSlots += slots;
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create availability for ${product.name}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETED');
  console.log('='.repeat(60));
  console.log(`Products processed: ${successCount}/${products.length}`);
  console.log(`Total availability slots created: ${totalSlots}`);
  console.log(`Period: March 2026 - December 2026`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

