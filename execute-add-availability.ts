/**
 * Execute SQL to add availability for all active products
 * Uses service role key to bypass RLS
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql: string): Promise<void> {
  console.log('📤 Executing SQL...');
  
  try {
    // Try using exec_sql function if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.error('❌ Error from RPC:', error);
      throw error;
    }
    
    console.log('✅ SQL executed successfully');
    if (data) {
      console.log('Result:', data);
    }
  } catch (err: any) {
    console.error('❌ Failed to execute SQL via RPC:', err.message);
    console.log('\n💡 Trying alternative approach: direct insert with service role...');
    throw err;
  }
}

async function addAvailabilityDirectly(): Promise<void> {
  console.log('🚀 Adding availability directly using service role key...\n');
  
  const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  
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
  
  // Delete existing future slots
  console.log('🗑️  Deleting existing slots from March 2026 onwards...');
  const { error: deleteError } = await supabase
    .from('availability_slot')
    .delete()
    .gte('date', '2026-03-01');
  
  if (deleteError) {
    console.error('Warning: Could not delete existing slots:', deleteError);
  } else {
    console.log('✅ Deleted existing future slots\n');
  }
  
  let totalSlots = 0;
  
  // Fetch and process experiences
  console.log('📋 Processing EXPERIENCES...');
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name, duration_hours, max_adults, max_dogs')
    .eq('active', true);
  
  if (expError) {
    console.error('Error fetching experiences:', expError);
  } else if (experiences) {
    console.log(`Found ${experiences.length} active experiences\n`);
    
    for (const exp of experiences) {
      console.log(`  📅 ${exp.name}`);
      const numDates = getRandomInt(30, 50);
      const dates = generateDates(new Date('2026-03-01'), new Date('2026-12-31'), numDates);
      const slotsToInsert: any[] = [];
      
      for (const date of dates) {
        const dateStr = formatDate(date);
        const useTimeSlots = Math.random() > 0.3;
        
        if (useTimeSlots) {
          const numSlots = getRandomInt(2, 4);
          const selectedSlots: string[] = [];
          
          for (let i = 0; i < numSlots; i++) {
            let timeSlot = getRandomElement(TIME_SLOTS);
            while (selectedSlots.includes(timeSlot)) {
              timeSlot = getRandomElement(TIME_SLOTS);
            }
            selectedSlots.push(timeSlot);
            
            const durationHours = exp.duration_hours || 2;
            const endTime = calculateEndTime(timeSlot, durationHours);
            
            slotsToInsert.push({
              product_id: exp.id,
              product_type: 'experience',
              date: dateStr,
              time_slot: timeSlot,
              end_time: endTime,
              max_adults: exp.max_adults || 10,
              max_dogs: exp.max_dogs || 5,
              booked_adults: 0,
              booked_dogs: 0
            });
          }
        } else {
          slotsToInsert.push({
            product_id: exp.id,
            product_type: 'experience',
            date: dateStr,
            time_slot: null,
            end_time: null,
            max_adults: exp.max_adults || 10,
            max_dogs: exp.max_dogs || 5,
            booked_adults: 0,
            booked_dogs: 0
          });
        }
      }
      
      // Insert in batches
      for (let i = 0; i < slotsToInsert.length; i += 100) {
        const batch = slotsToInsert.slice(i, i + 100);
        const { error } = await supabase
          .from('availability_slot')
          .insert(batch);
        
        if (error) {
          console.error(`    ❌ Error inserting batch:`, error);
        } else {
          totalSlots += batch.length;
        }
      }
      
      console.log(`    ✅ Created ${slotsToInsert.length} slots`);
    }
  }
  
  // Fetch and process classes
  console.log('\n📋 Processing CLASSES...');
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name, duration_hours, max_adults, max_dogs')
    .eq('active', true);
  
  if (classError) {
    console.error('Error fetching classes:', classError);
  } else if (classes) {
    console.log(`Found ${classes.length} active classes\n`);
    
    for (const cls of classes) {
      console.log(`  📅 ${cls.name}`);
      const numDates = getRandomInt(30, 50);
      const dates = generateDates(new Date('2026-03-01'), new Date('2026-12-31'), numDates);
      const slotsToInsert: any[] = [];
      
      for (const date of dates) {
        const dateStr = formatDate(date);
        const useTimeSlots = Math.random() > 0.3;
        
        if (useTimeSlots) {
          const numSlots = getRandomInt(2, 4);
          const selectedSlots: string[] = [];
          
          for (let i = 0; i < numSlots; i++) {
            let timeSlot = getRandomElement(TIME_SLOTS);
            while (selectedSlots.includes(timeSlot)) {
              timeSlot = getRandomElement(TIME_SLOTS);
            }
            selectedSlots.push(timeSlot);
            
            const durationHours = cls.duration_hours || 2;
            const endTime = calculateEndTime(timeSlot, durationHours);
            
            slotsToInsert.push({
              product_id: cls.id,
              product_type: 'class',
              date: dateStr,
              time_slot: timeSlot,
              end_time: endTime,
              max_adults: cls.max_adults || 10,
              max_dogs: cls.max_dogs || 5,
              booked_adults: 0,
              booked_dogs: 0
            });
          }
        } else {
          slotsToInsert.push({
            product_id: cls.id,
            product_type: 'class',
            date: dateStr,
            time_slot: null,
            end_time: null,
            max_adults: cls.max_adults || 10,
            max_dogs: cls.max_dogs || 5,
            booked_adults: 0,
            booked_dogs: 0
          });
        }
      }
      
      // Insert in batches
      for (let i = 0; i < slotsToInsert.length; i += 100) {
        const batch = slotsToInsert.slice(i, i + 100);
        const { error } = await supabase
          .from('availability_slot')
          .insert(batch);
        
        if (error) {
          console.error(`    ❌ Error inserting batch:`, error);
        } else {
          totalSlots += batch.length;
        }
      }
      
      console.log(`    ✅ Created ${slotsToInsert.length} slots`);
    }
  }
  
  // Fetch and process trips
  console.log('\n📋 Processing TRIPS...');
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, max_adults, max_dogs')
    .eq('active', true);
  
  if (tripError) {
    console.error('Error fetching trips:', tripError);
  } else if (trips) {
    console.log(`Found ${trips.length} active trips\n`);
    
    for (const trip of trips) {
      console.log(`  📅 ${trip.name}`);
      const numDates = getRandomInt(30, 50);
      const dates = generateDates(new Date('2026-03-01'), new Date('2026-12-31'), numDates);
      const slotsToInsert: any[] = [];
      
      for (const date of dates) {
        const dateStr = formatDate(date);
        
        slotsToInsert.push({
          product_id: trip.id,
          product_type: 'trip',
          date: dateStr,
          time_slot: null,
          end_time: null,
          max_adults: trip.max_adults || 10,
          max_dogs: trip.max_dogs || 5,
          booked_adults: 0,
          booked_dogs: 0
        });
      }
      
      // Insert in batches
      for (let i = 0; i < slotsToInsert.length; i += 100) {
        const batch = slotsToInsert.slice(i, i + 100);
        const { error } = await supabase
          .from('availability_slot')
          .insert(batch);
        
        if (error) {
          console.error(`    ❌ Error inserting batch:`, error);
        } else {
          totalSlots += batch.length;
        }
      }
      
      console.log(`    ✅ Created ${slotsToInsert.length} slots`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETED');
  console.log('='.repeat(60));
  console.log(`Total availability slots created: ${totalSlots}`);
  console.log(`Period: March 2026 - December 2026`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Starting availability generation...\n');
  
  try {
    // Try SQL approach first
    const sqlFile = path.join(__dirname, 'add-availability-march-2026.sql');
    if (fs.existsSync(sqlFile)) {
      console.log('📄 Found SQL file, attempting to execute...');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      await executeSQL(sql);
    }
  } catch (err) {
    console.log('\n📝 SQL approach failed, using direct insert method...\n');
    await addAvailabilityDirectly();
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err);
  process.exit(1);
});

