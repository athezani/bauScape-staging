-- ============================================
-- Setup Products and Availability
-- ============================================
-- 1. Associa tutti i prodotti al provider "lastminute.com"
-- 2. Crea availability_slot con date random da marzo 2026 in poi
-- 3. Per experiences/classes: aggiunge più slot per alcuni giorni
-- ============================================

-- Temporaneamente disabilita il constraint per permettere inserimento date future
ALTER TABLE IF EXISTS public.availability_slot DROP CONSTRAINT IF EXISTS availability_slot_future_date;

DO $$
DECLARE
  lastminute_provider_id UUID;
  product_record RECORD;
  random_date DATE;
  days_ahead INTEGER;
  slot_date DATE;
  time_slots TEXT[] := ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
  selected_slots TEXT[];
  num_slots INTEGER;
  slot_time TEXT;
  product_duration_hours INTEGER;
  end_time_calc TIME;
  trip_duration_days INTEGER;
  trip_end_date DATE;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Step 1: Trova o crea il provider "lastminute.com"
  -- Prima cerca se esiste già un provider con questo nome
  SELECT id INTO lastminute_provider_id
  FROM public.profile
  WHERE LOWER(company_name) LIKE '%lastminute%' OR LOWER(company_name) LIKE '%last minute%'
  LIMIT 1;
  
  -- Se non esiste, cerca un provider esistente o crea uno nuovo
  IF lastminute_provider_id IS NULL THEN
    -- Cerca un provider esistente qualsiasi
    SELECT id INTO lastminute_provider_id
    FROM public.profile
    WHERE active = true
    LIMIT 1;
    
    -- Se ancora non esiste, crea un nuovo provider
    -- Nota: questo richiede un utente auth esistente, quindi meglio usare uno esistente
    IF lastminute_provider_id IS NULL THEN
      RAISE NOTICE 'Nessun provider trovato. Assicurati che esista almeno un provider nel sistema.';
      RETURN;
    ELSE
      -- Aggiorna il nome del provider esistente
      UPDATE public.profile
      SET company_name = 'lastminute.com'
      WHERE id = lastminute_provider_id;
      RAISE NOTICE 'Provider esistente aggiornato a: lastminute.com (ID: %)', lastminute_provider_id;
    END IF;
  ELSE
    RAISE NOTICE 'Provider trovato: lastminute.com (ID: %)', lastminute_provider_id;
  END IF;
  
  -- Step 2: Associa tutti i prodotti esistenti al provider lastminute.com
  UPDATE public.experience
  SET provider_id = lastminute_provider_id
  WHERE provider_id IS NOT NULL;
  
  UPDATE public.class
  SET provider_id = lastminute_provider_id
  WHERE provider_id IS NOT NULL;
  
  UPDATE public.trip
  SET provider_id = lastminute_provider_id
  WHERE provider_id IS NOT NULL;
  
  RAISE NOTICE 'Prodotti associati al provider lastminute.com';
  
  -- Step 3: Elimina availability_slot esistenti per ricrearle
  DELETE FROM public.availability_slot;
  RAISE NOTICE 'Availability slots esistenti eliminate';
  
  -- Step 4: Crea availability_slot per tutte le experiences
  FOR product_record IN 
    SELECT id, duration_hours, max_participants
    FROM public.experience
    WHERE active = true
  LOOP
    -- Genera 20-30 date random da marzo 2026 a dicembre 2026
    FOR i IN 1..(20 + floor(random() * 11)::INTEGER) LOOP
      -- Data random tra marzo 2026 e dicembre 2026
      days_ahead := 90 + floor(random() * 275)::INTEGER; -- Da ~90 giorni (marzo) a ~365 giorni (dicembre)
      slot_date := '2026-03-01'::DATE + (days_ahead || ' days')::INTERVAL;
      
      -- Decidi se creare più slot o un solo slot full-day
      -- 60% probabilità di avere più slot, 40% di avere full-day
      IF random() < 0.6 THEN
        -- Crea 2-4 slot per questo giorno
        num_slots := 2 + floor(random() * 3)::INTEGER;
        selected_slots := ARRAY[]::TEXT[];
        
        -- Seleziona slot random dalla lista
        FOR j IN 1..num_slots LOOP
          slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          -- Evita duplicati
          WHILE slot_time = ANY(selected_slots) LOOP
            slot_time := time_slots[1 + floor(random() * array_length(time_slots, 1))::INTEGER];
          END LOOP;
          selected_slots := array_append(selected_slots, slot_time);
        END LOOP;
        
        -- Crea gli slot selezionati
        FOREACH slot_time IN ARRAY selected_slots LOOP
          -- Calcola end_time basato su duration_hours
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
            COALESCE(product_record.max_participants, 10),
            999,
            0,
            0
          );
        END LOOP;
      ELSE
        -- Crea un solo slot full-day (senza time_slot)
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
          COALESCE(product_record.max_participants, 10),
          999,
          0,
          0
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Availability slots create per experiences';
  
  -- Step 5: Crea availability_slot per tutte le classes
  FOR product_record IN 
    SELECT id, duration_hours, max_participants
    FROM public.class
    WHERE active = true
  LOOP
    -- Genera 20-30 date random da marzo 2026 a dicembre 2026
    FOR i IN 1..(20 + floor(random() * 11)::INTEGER) LOOP
      -- Data random tra marzo 2026 e dicembre 2026
      days_ahead := 90 + floor(random() * 275)::INTEGER;
      slot_date := '2026-03-01'::DATE + (days_ahead || ' days')::INTERVAL;
      
      -- Decidi se creare più slot o un solo slot full-day
      IF random() < 0.6 THEN
        -- Crea 2-4 slot per questo giorno
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
            COALESCE(product_record.max_participants, 10),
            999,
            0,
            0
          );
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
          COALESCE(product_record.max_participants, 10),
          999,
          0,
          0
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Availability slots create per classes';
  
  -- Step 6: Crea availability_slot per tutti i trips
  -- Per i trip: ogni prodotto ha un solo periodo predefinito (start_date + duration_days)
  FOR product_record IN 
    SELECT id, start_date, max_participants
    FROM public.trip
    WHERE active = true AND start_date IS NOT NULL
  LOOP
    -- Per i trip, crea un solo slot con la data di inizio del prodotto
    -- Il periodo completo è definito da start_date + duration_days nel prodotto
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
      product_record.start_date, -- Usa la data di inizio del prodotto
      NULL,
      NULL,
      COALESCE(product_record.max_participants, 10),
      999,
      0,
      0
    )
    ON CONFLICT DO NOTHING; -- Evita duplicati se lo slot esiste già
  END LOOP;
  
  RAISE NOTICE 'Availability slots create per trips';
  
  RAISE NOTICE 'Setup completato!';
END $$;

-- Riabilita il constraint dopo l'inserimento (permettendo date da marzo 2026 in poi)
-- Rimuovi il constraint esistente se presente
ALTER TABLE IF EXISTS public.availability_slot 
DROP CONSTRAINT IF EXISTS availability_slot_future_date;

-- Aggiungi il nuovo constraint solo se non ci sono righe che lo violano
DO $$
BEGIN
  -- Verifica se ci sono righe con date < '2026-03-01'
  IF NOT EXISTS (
    SELECT 1 FROM public.availability_slot 
    WHERE date < '2026-03-01'::DATE
  ) THEN
    ALTER TABLE public.availability_slot 
    ADD CONSTRAINT availability_slot_future_date CHECK (
      date >= '2026-03-01'::DATE
    );
  ELSE
    RAISE NOTICE 'Constraint non aggiunto: esistono righe con date < 2026-03-01';
  END IF;
END $$;

-- Mostra statistiche finali
SELECT 
  product_type,
  COUNT(*) as total_slots,
  COUNT(DISTINCT product_id) as products_with_slots,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM public.availability_slot
GROUP BY product_type
ORDER BY product_type;

