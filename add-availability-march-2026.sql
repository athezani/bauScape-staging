-- ============================================
-- ADD AVAILABILITY FOR ALL ACTIVE PRODUCTS
-- Period: March 2026 - December 2026
-- ============================================

DO $$
DECLARE
  product_record RECORD;
  slot_date DATE;
  days_ahead INTEGER;
  num_slots INTEGER;
  time_slots TEXT[] := ARRAY['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  selected_slots TEXT[];
  slot_time TEXT;
  product_duration_hours INTEGER;
  end_time_calc TIME;
  i INTEGER;
  j INTEGER;
  slots_created INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting availability generation for all active products...';
  RAISE NOTICE 'Period: March 2026 - December 2026';
  
  -- First, delete existing future slots from March 2026 onwards
  RAISE NOTICE 'Deleting existing slots from March 2026 onwards...';
  DELETE FROM public.availability_slot WHERE date >= '2026-03-01';
  
  -- ============================================
  -- EXPERIENCES
  -- ============================================
  RAISE NOTICE 'Processing EXPERIENCES...';
  FOR product_record IN 
    SELECT id, name, duration_hours, max_adults, max_dogs
    FROM public.experience
    WHERE active = true
  LOOP
    RAISE NOTICE '  Creating availability for: % (%)', product_record.name, product_record.id;
    
    -- Generate 30-50 random dates from March 2026 to December 2026
    FOR i IN 1..(30 + floor(random() * 21)::INTEGER) LOOP
      -- Random date between March 2026 and December 2026 (275 days range)
      days_ahead := floor(random() * 306)::INTEGER;
      slot_date := '2026-03-01'::DATE + (days_ahead || ' days')::INTERVAL;
      
      -- 70% chance of creating time slots, 30% full-day
      IF random() < 0.7 THEN
        -- Create 2-4 time slots for this day
        num_slots := 2 + floor(random() * 3)::INTEGER;
        selected_slots := ARRAY[]::TEXT[];
        
        FOR j IN 1..num_slots LOOP
          slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          WHILE slot_time = ANY(selected_slots) LOOP
            slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          END LOOP;
          selected_slots := array_append(selected_slots, slot_time);
        END LOOP;
        
        -- Insert each time slot
        FOREACH slot_time IN ARRAY selected_slots LOOP
          product_duration_hours := COALESCE(product_record.duration_hours, 2);
          end_time_calc := (slot_time::TIME + (product_duration_hours || ' hours')::INTERVAL)::TIME;
          
          INSERT INTO public.availability_slot (
            product_id,
            product_type,
            date,
            time_slot,
            end_time,
            max_adults,
            max_dogs,
            booked_adults,
            booked_dogs
          ) VALUES (
            product_record.id,
            'experience',
            slot_date,
            slot_time::TIME,
            end_time_calc,
            COALESCE(product_record.max_adults, 10),
            COALESCE(product_record.max_dogs, 5),
            0,
            0
          );
          slots_created := slots_created + 1;
        END LOOP;
      ELSE
        -- Full-day slot
        INSERT INTO public.availability_slot (
          product_id,
          product_type,
          date,
          time_slot,
          end_time,
          max_adults,
          max_dogs,
          booked_adults,
          booked_dogs
        ) VALUES (
          product_record.id,
          'experience',
          slot_date,
          NULL,
          NULL,
          COALESCE(product_record.max_adults, 10),
          COALESCE(product_record.max_dogs, 5),
          0,
          0
        );
        slots_created := slots_created + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  -- ============================================
  -- CLASSES
  -- ============================================
  RAISE NOTICE 'Processing CLASSES...';
  FOR product_record IN 
    SELECT id, name, duration_hours, max_adults, max_dogs
    FROM public.class
    WHERE active = true
  LOOP
    RAISE NOTICE '  Creating availability for: % (%)', product_record.name, product_record.id;
    
    -- Generate 30-50 random dates
    FOR i IN 1..(30 + floor(random() * 21)::INTEGER) LOOP
      days_ahead := floor(random() * 306)::INTEGER;
      slot_date := '2026-03-01'::DATE + (days_ahead || ' days')::INTERVAL;
      
      -- 70% chance of time slots
      IF random() < 0.7 THEN
        num_slots := 2 + floor(random() * 3)::INTEGER;
        selected_slots := ARRAY[]::TEXT[];
        
        FOR j IN 1..num_slots LOOP
          slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          WHILE slot_time = ANY(selected_slots) LOOP
            slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          END LOOP;
          selected_slots := array_append(selected_slots, slot_time);
        END LOOP;
        
        FOREACH slot_time IN ARRAY selected_slots LOOP
          product_duration_hours := COALESCE(product_record.duration_hours, 2);
          end_time_calc := (slot_time::TIME + (product_duration_hours || ' hours')::INTERVAL)::TIME;
          
          INSERT INTO public.availability_slot (
            product_id,
            product_type,
            date,
            time_slot,
            end_time,
            max_adults,
            max_dogs,
            booked_adults,
            booked_dogs
          ) VALUES (
            product_record.id,
            'class',
            slot_date,
            slot_time::TIME,
            end_time_calc,
            COALESCE(product_record.max_adults, 10),
            COALESCE(product_record.max_dogs, 5),
            0,
            0
          );
          slots_created := slots_created + 1;
        END LOOP;
      ELSE
        -- Full-day slot
        INSERT INTO public.availability_slot (
          product_id,
          product_type,
          date,
          time_slot,
          end_time,
          max_adults,
          max_dogs,
          booked_adults,
          booked_dogs
        ) VALUES (
          product_record.id,
          'class',
          slot_date,
          NULL,
          NULL,
          COALESCE(product_record.max_adults, 10),
          COALESCE(product_record.max_dogs, 5),
          0,
          0
        );
        slots_created := slots_created + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  -- ============================================
  -- TRIPS
  -- ============================================
  RAISE NOTICE 'Processing TRIPS...';
  FOR product_record IN 
    SELECT id, name, max_adults, max_dogs
    FROM public.trip
    WHERE active = true
  LOOP
    RAISE NOTICE '  Creating availability for: % (%)', product_record.name, product_record.id;
    
    -- Generate 30-50 random dates (trips only have full-day slots, no time_slot)
    FOR i IN 1..(30 + floor(random() * 21)::INTEGER) LOOP
      days_ahead := floor(random() * 306)::INTEGER;
      slot_date := '2026-03-01'::DATE + (days_ahead || ' days')::INTERVAL;
      
      -- Trips always have NULL time_slot
      INSERT INTO public.availability_slot (
        product_id,
        product_type,
        date,
        time_slot,
        end_time,
        max_adults,
        max_dogs,
        booked_adults,
        booked_dogs
      ) VALUES (
        product_record.id,
        'trip',
        slot_date,
        NULL,
        NULL,
        COALESCE(product_record.max_adults, 10),
        COALESCE(product_record.max_dogs, 5),
        0,
        0
      );
      slots_created := slots_created + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'COMPLETED: Created % availability slots', slots_created;
  RAISE NOTICE 'Period: March 2026 - December 2026';
  RAISE NOTICE '============================================================';
END $$;

