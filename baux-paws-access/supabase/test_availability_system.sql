-- ============================================
-- TEST COMPLETO SISTEMA DISPONIBILITÀ
-- ============================================

\echo '========================================'
\echo 'TEST 1: Verifica struttura database'
\echo '========================================'

-- Verifica che la tabella availability_slot esista
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'availability_slot')
    THEN '✓ Tabella availability_slot esiste'
    ELSE '✗ ERRORE: Tabella availability_slot NON esiste'
  END AS test_result;

-- Verifica campi aggiunti alle tabelle prodotto
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'experience' 
      AND column_name = 'active'
    )
    THEN '✓ Campo active aggiunto a experience'
    ELSE '✗ ERRORE: Campo active NON presente in experience'
  END AS test_result;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'experience' 
      AND column_name = 'cutoff_hours'
    )
    THEN '✓ Campo cutoff_hours aggiunto a experience'
    ELSE '✗ ERRORE: Campo cutoff_hours NON presente in experience'
  END AS test_result;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'availability_slot_id'
    )
    THEN '✓ Campo availability_slot_id aggiunto a booking'
    ELSE '✗ ERRORE: Campo availability_slot_id NON presente in booking'
  END AS test_result;

\echo ''
\echo '========================================'
\echo 'TEST 2: Creazione availability slots'
\echo '========================================'

-- Ottieni un prodotto esistente per test
DO $$
DECLARE
  test_experience_id UUID;
  test_class_id UUID;
  test_trip_id UUID;
  slot_id UUID;
BEGIN
  -- Trova un experience esistente
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  
  IF test_experience_id IS NULL THEN
    RAISE NOTICE 'ATTENZIONE: Nessun experience trovato per i test';
  ELSE
    RAISE NOTICE 'Trovato experience con ID: %', test_experience_id;
    
    -- Crea availability slot per experience con time slots
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
      test_experience_id,
      'experience',
      CURRENT_DATE + INTERVAL '7 days',
      '10:00:00',
      '13:00:00',
      10,
      5,
      0,
      0
    ) RETURNING id INTO slot_id;
    
    RAISE NOTICE '✓ Creato availability slot per experience: %', slot_id;
    
    -- Crea un secondo slot per lo stesso giorno
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
      test_experience_id,
      'experience',
      CURRENT_DATE + INTERVAL '7 days',
      '14:00:00',
      '17:00:00',
      8,
      4,
      0,
      0
    );
    
    RAISE NOTICE '✓ Creato secondo slot per lo stesso giorno';
    
    -- Crea slot full-day (senza time_slot)
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
      test_experience_id,
      'experience',
      CURRENT_DATE + INTERVAL '8 days',
      NULL,
      NULL,
      15,
      10,
      0,
      0
    );
    
    RAISE NOTICE '✓ Creato slot full-day';
  END IF;
  
  -- Trova un class esistente
  SELECT id INTO test_class_id FROM public.class LIMIT 1;
  
  IF test_class_id IS NULL THEN
    RAISE NOTICE 'ATTENZIONE: Nessun class trovato per i test';
  ELSE
    RAISE NOTICE 'Trovato class con ID: %', test_class_id;
    
    -- Crea availability slot per class
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
      test_class_id,
      'class',
      CURRENT_DATE + INTERVAL '10 days',
      '09:00:00',
      '11:00:00',
      12,
      6,
      0,
      0
    );
    
    RAISE NOTICE '✓ Creato availability slot per class';
  END IF;
  
  -- Trova un trip esistente
  SELECT id INTO test_trip_id FROM public.trip LIMIT 1;
  
  IF test_trip_id IS NULL THEN
    RAISE NOTICE 'ATTENZIONE: Nessun trip trovato per i test';
  ELSE
    RAISE NOTICE 'Trovato trip con ID: %', test_trip_id;
    
    -- Crea availability slot per trip (solo start date, no time_slot)
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
      test_trip_id,
      'trip',
      CURRENT_DATE + INTERVAL '14 days',
      NULL,
      NULL,
      20,
      10,
      0,
      0
    );
    
    RAISE NOTICE '✓ Creato availability slot per trip';
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 3: Verifica creazione slots'
\echo '========================================'

SELECT 
  product_type,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN time_slot IS NULL THEN 1 END) as full_day_slots,
  COUNT(CASE WHEN time_slot IS NOT NULL THEN 1 END) as time_slot_slots
FROM public.availability_slot
GROUP BY product_type;

\echo ''
\echo '========================================'
\echo 'TEST 4: Impostazione cutoff_hours e active'
\echo '========================================'

DO $$
DECLARE
  test_experience_id UUID;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  
  IF test_experience_id IS NOT NULL THEN
    -- Imposta cutoff_hours a 24 ore
    UPDATE public.experience 
    SET cutoff_hours = 24, active = true
    WHERE id = test_experience_id;
    
    RAISE NOTICE '✓ Impostato cutoff_hours = 24 e active = true per experience';
    
    -- Verifica
    SELECT 
      CASE 
        WHEN cutoff_hours = 24 AND active = true
        THEN '✓ Verifica cutoff_hours e active: OK'
        ELSE '✗ ERRORE: cutoff_hours o active non impostati correttamente'
      END
    FROM public.experience
    WHERE id = test_experience_id;
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 5: Funzione is_slot_available'
\echo '========================================'

DO $$
DECLARE
  test_experience_id UUID;
  test_date DATE;
  test_time TIME;
  is_available BOOLEAN;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  SELECT date INTO test_date FROM public.availability_slot WHERE product_id = test_experience_id LIMIT 1;
  SELECT time_slot INTO test_time FROM public.availability_slot WHERE product_id = test_experience_id AND time_slot IS NOT NULL LIMIT 1;
  
  IF test_experience_id IS NOT NULL AND test_date IS NOT NULL THEN
    -- Test con time slot
    IF test_time IS NOT NULL THEN
      SELECT public.is_slot_available(test_experience_id, 'experience', test_date, test_time) INTO is_available;
      
      IF is_available THEN
        RAISE NOTICE '✓ Funzione is_slot_available: Slot disponibile (OK)';
      ELSE
        RAISE NOTICE '✗ ERRORE: Funzione is_slot_available: Slot non disponibile quando dovrebbe esserlo';
      END IF;
    END IF;
    
    -- Test con full-day (NULL time)
    SELECT public.is_slot_available(test_experience_id, 'experience', test_date, NULL) INTO is_available;
    
    IF is_available THEN
      RAISE NOTICE '✓ Funzione is_slot_available: Full-day slot disponibile (OK)';
    ELSE
      RAISE NOTICE '⚠ ATTENZIONE: Full-day slot non disponibile (potrebbe essere normale se non esiste)';
    END IF;
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 6: Creazione booking e aggiornamento contatori'
\echo '========================================'

DO $$
DECLARE
  test_slot_id UUID;
  test_provider_id UUID;
  booking_id UUID;
  booked_before INTEGER;
  booked_after INTEGER;
BEGIN
  -- Trova uno slot disponibile
  SELECT id INTO test_slot_id 
  FROM public.availability_slot 
  WHERE booked_adults < max_adults 
    AND booked_dogs < max_dogs
  LIMIT 1;
  
  -- Trova un provider esistente
  SELECT id INTO test_provider_id FROM public.profile LIMIT 1;
  
  IF test_slot_id IS NULL THEN
    RAISE NOTICE 'ATTENZIONE: Nessuno slot disponibile trovato per il test';
  ELSIF test_provider_id IS NULL THEN
    RAISE NOTICE 'ATTENZIONE: Nessun provider trovato per il test';
  ELSE
    -- Leggi contatori prima del booking
    SELECT booked_adults, booked_dogs INTO booked_before, booked_dogs
    FROM public.availability_slot WHERE id = test_slot_id;
    
    RAISE NOTICE 'Contatori PRIMA del booking: adults=%, dogs=%', booked_before, booked_dogs;
    
    -- Crea un booking con availability_slot_id
    -- NOTA: La tabella booking nel provider portal usa number_of_humans invece di number_of_adults
    INSERT INTO public.booking (
      provider_id,
      customer_name,
      customer_email,
      product_name,
      product_type,
      booking_date,
      booking_time,
      number_of_humans,
      number_of_dogs,
      availability_slot_id,
      status
    ) VALUES (
      test_provider_id,
      'Test Customer',
      'test@example.com',
      'Test Product',
      'experience',
      (SELECT date FROM public.availability_slot WHERE id = test_slot_id),
      (SELECT time_slot FROM public.availability_slot WHERE id = test_slot_id),
      2,
      1,
      test_slot_id,
      'pending'
    ) RETURNING id INTO booking_id;
    
    RAISE NOTICE '✓ Creato booking con ID: %', booking_id;
    
    -- Leggi contatori dopo il booking (dovrebbero essere incrementati dal trigger)
    SELECT booked_adults INTO booked_after
    FROM public.availability_slot WHERE id = test_slot_id;
    
    RAISE NOTICE 'Contatori DOPO il booking: adults=%', booked_after;
    
    IF booked_after = booked_before + 2 THEN
      RAISE NOTICE '✓ TRIGGER FUNZIONA: booked_adults incrementato correttamente (+2)';
    ELSE
      RAISE NOTICE '✗ ERRORE TRIGGER: booked_adults dovrebbe essere % ma è %', booked_before + 2, booked_after;
    END IF;
    
    -- Test cancellazione booking
    UPDATE public.booking 
    SET status = 'cancelled'
    WHERE id = booking_id;
    
    -- Leggi contatori dopo cancellazione
    SELECT booked_adults INTO booked_after
    FROM public.availability_slot WHERE id = test_slot_id;
    
    RAISE NOTICE 'Contatori DOPO cancellazione: adults=%', booked_after;
    
    IF booked_after = booked_before THEN
      RAISE NOTICE '✓ TRIGGER CANCELLAZIONE FUNZIONA: booked_adults decrementato correttamente';
    ELSE
      RAISE NOTICE '✗ ERRORE TRIGGER CANCELLAZIONE: booked_adults dovrebbe essere % ma è %', booked_before, booked_after;
    END IF;
    
    -- Pulisci: elimina il booking di test
    DELETE FROM public.booking WHERE id = booking_id;
    RAISE NOTICE '✓ Booking di test eliminato';
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 7: Verifica cutoff time'
\echo '========================================'

DO $$
DECLARE
  test_experience_id UUID;
  test_slot_id UUID;
  cutoff_hours INTEGER;
  slot_date DATE;
  slot_time TIME;
  is_available BOOLEAN;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  
  IF test_experience_id IS NOT NULL THEN
    -- Imposta cutoff_hours a 24
    UPDATE public.experience SET cutoff_hours = 24 WHERE id = test_experience_id;
    
    -- Crea uno slot molto vicino (1 ora da ora)
    slot_date := CURRENT_DATE;
    slot_time := (CURRENT_TIME + INTERVAL '1 hour')::TIME;
    
    -- Crea slot di test
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
      test_experience_id,
      'experience',
      slot_date,
      slot_time,
      (slot_time + INTERVAL '2 hours')::TIME,
      10,
      5,
      0,
      0
    ) RETURNING id INTO test_slot_id;
    
    -- Test: slot troppo vicino dovrebbe essere non disponibile
    SELECT public.is_slot_available(test_experience_id, 'experience', slot_date, slot_time) INTO is_available;
    
    IF NOT is_available THEN
      RAISE NOTICE '✓ CUTOFF TIME FUNZIONA: Slot troppo vicino correttamente bloccato';
    ELSE
      RAISE NOTICE '✗ ERRORE CUTOFF TIME: Slot troppo vicino dovrebbe essere bloccato';
    END IF;
    
    -- Pulisci
    DELETE FROM public.availability_slot WHERE id = test_slot_id;
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 8: Verifica campo active'
\echo '========================================'

DO $$
DECLARE
  test_experience_id UUID;
  active_count INTEGER;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  
  IF test_experience_id IS NOT NULL THEN
    -- Disattiva prodotto
    UPDATE public.experience SET active = false WHERE id = test_experience_id;
    
    -- Verifica che sia disattivato
    SELECT COUNT(*) INTO active_count 
    FROM public.experience 
    WHERE id = test_experience_id AND active = false;
    
    IF active_count = 1 THEN
      RAISE NOTICE '✓ Campo active: Prodotto correttamente disattivato';
    ELSE
      RAISE NOTICE '✗ ERRORE: Campo active non funziona correttamente';
    END IF;
    
    -- Riattiva prodotto
    UPDATE public.experience SET active = true WHERE id = test_experience_id;
    RAISE NOTICE '✓ Prodotto riattivato per continuare i test';
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'TEST 9: Verifica RLS policies'
\echo '========================================'

-- Verifica che le policies esistano
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%Public can view%' THEN '✓ Policy pubblica presente'
    ELSE 'Policy: ' || policyname
  END AS policy_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('experience', 'class', 'trip', 'availability_slot')
ORDER BY tablename, policyname;

\echo ''
\echo '========================================'
\echo 'TEST 10: Verifica constraint e validazioni'
\echo '========================================'

DO $$
DECLARE
  test_experience_id UUID;
  constraint_violated BOOLEAN := false;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  
  IF test_experience_id IS NOT NULL THEN
    -- Test: tentativo di creare slot con booked > max (dovrebbe fallire)
    BEGIN
      INSERT INTO public.availability_slot (
        product_id,
        product_type,
        date,
        time_slot,
        max_adults,
        max_dogs,
        booked_adults,
        booked_dogs
      ) VALUES (
        test_experience_id,
        'experience',
        CURRENT_DATE + INTERVAL '30 days',
        '10:00:00',
        10,
        5,
        15,  -- booked > max (dovrebbe fallire)
        3
      );
      
      constraint_violated := false;
      RAISE NOTICE '✗ ERRORE: Constraint capacity_check non funziona (dovrebbe bloccare booked > max)';
    EXCEPTION
      WHEN check_violation THEN
        constraint_violated := true;
        RAISE NOTICE '✓ CONSTRAINT FUNZIONA: booked > max correttamente bloccato';
    END;
    
    -- Test: tentativo di creare slot con data nel passato (dovrebbe fallire)
    BEGIN
      INSERT INTO public.availability_slot (
        product_id,
        product_type,
        date,
        time_slot,
        max_adults,
        max_dogs,
        booked_adults,
        booked_dogs
      ) VALUES (
        test_experience_id,
        'experience',
        CURRENT_DATE - INTERVAL '1 day',  -- Data nel passato
        '10:00:00',
        10,
        5,
        0,
        0
      );
      
      RAISE NOTICE '✗ ERRORE: Constraint future_date non funziona (dovrebbe bloccare date passate)';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE '✓ CONSTRAINT FUNZIONA: Date nel passato correttamente bloccata';
    END;
  END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'RIEPILOGO FINALE'
\echo '========================================'

SELECT 
  'Total availability slots' AS metric,
  COUNT(*)::TEXT AS value
FROM public.availability_slot
UNION ALL
SELECT 
  'Slots with time slots' AS metric,
  COUNT(*)::TEXT
FROM public.availability_slot
WHERE time_slot IS NOT NULL
UNION ALL
SELECT 
  'Full-day slots' AS metric,
  COUNT(*)::TEXT
FROM public.availability_slot
WHERE time_slot IS NULL
UNION ALL
SELECT 
  'Active products' AS metric,
  (
    SELECT COUNT(*) FROM public.experience WHERE active = true
    UNION ALL
    SELECT COUNT(*) FROM public.class WHERE active = true
    UNION ALL
    SELECT COUNT(*) FROM public.trip WHERE active = true
  )::TEXT
UNION ALL
SELECT 
  'Products with cutoff_hours set' AS metric,
  (
    SELECT COUNT(*) FROM public.experience WHERE cutoff_hours IS NOT NULL
    UNION ALL
    SELECT COUNT(*) FROM public.class WHERE cutoff_hours IS NOT NULL
    UNION ALL
    SELECT COUNT(*) FROM public.trip WHERE cutoff_hours IS NOT NULL
  )::TEXT;

\echo ''
\echo '========================================'
\echo 'TEST COMPLETATI'
\echo '========================================'
\echo 'Verifica i risultati sopra per eventuali errori.'
\echo 'Se tutti i test mostrano ✓, il sistema funziona correttamente!'

