-- ============================================
-- Create missing availability slots for trips
-- ============================================
-- This migration ensures all active trips have at least one availability slot
-- ============================================

DO $$
DECLARE
  trip_record RECORD;
  slot_date DATE;
  days_ahead INTEGER;
  trip_duration_days INTEGER;
  trip_end_date DATE;
  slot_count INTEGER;
BEGIN
  RAISE NOTICE 'Creating missing availability slots for trips...';
  
  -- Loop through all active trips
        FOR trip_record IN
          SELECT id, name, duration_days, start_date, end_date, max_adults, max_dogs
          FROM public.trip
          WHERE active = true
  LOOP
    -- Check if trip already has availability slots
    SELECT COUNT(*) INTO slot_count
    FROM public.availability_slot
    WHERE product_id = trip_record.id
      AND product_type = 'trip'
      AND date >= CURRENT_DATE;
    
    -- If no slots exist, create one
    IF slot_count = 0 THEN
      RAISE NOTICE 'Creating slot for trip: % (ID: %)', trip_record.name, trip_record.id;
      
      -- Determine the slot date
      -- Use trip.start_date if available, otherwise use a date 30 days from now
      IF trip_record.start_date IS NOT NULL AND trip_record.start_date >= CURRENT_DATE THEN
        slot_date := trip_record.start_date;
      ELSE
        slot_date := CURRENT_DATE + INTERVAL '30 days';
      END IF;
      
      -- Get trip duration
      trip_duration_days := COALESCE(trip_record.duration_days, 3);
      
      -- Calculate end date
      IF trip_record.end_date IS NOT NULL THEN
        trip_end_date := trip_record.end_date;
      ELSE
        trip_end_date := slot_date + (trip_duration_days - 1 || ' days')::INTERVAL;
      END IF;
      
      -- Create availability slot for the trip
      INSERT INTO public.availability_slot (
        product_id,
        product_type,
        date,
        time_slot, -- NULL for trips
        end_time, -- NULL for trips
        max_adults,
        max_dogs,
        booked_adults,
        booked_dogs
      ) VALUES (
        trip_record.id,
        'trip',
        slot_date,
        NULL, -- Trips don't have time slots
        NULL, -- Trips don't have end time
              COALESCE(trip_record.max_adults, 10),
        COALESCE(trip_record.max_dogs, 999), -- Default max dogs
        0, -- No bookings yet
        0  -- No bookings yet
      );
      
      RAISE NOTICE 'Created slot for trip %: date = %, duration = % days', 
        trip_record.name, slot_date, trip_duration_days;
    ELSE
      RAISE NOTICE 'Trip % already has % availability slot(s)', trip_record.name, slot_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Finished creating missing trip slots.';
END $$;

-- Add comment
COMMENT ON TABLE public.availability_slot IS 'Stores availability slots for products. For trips, only start date is stored (time_slot is NULL).';

