# Test Sistema Disponibilità - Backend

## Istruzioni

1. Vai al [Supabase Dashboard](https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo)
2. Apri il **SQL Editor**
3. Copia e incolla lo script SQL qui sotto
4. Esegui lo script
5. Verifica i risultati

## ⚠️ IMPORTANTE: Usa `number_of_humans` (NON `number_of_adults`) per provider portal!

## Script SQL da Eseguire

**OPPURE usa il file `TEST_AVAILABILITY_SYSTEM_FIXED.sql` che è già corretto!**

```sql
-- ============================================
-- TEST COMPLETO SISTEMA DISPONIBILITÀ
-- ============================================

-- TEST 1: Verifica struttura database
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'availability_slot')
    THEN '✓ Tabella availability_slot esiste'
    ELSE '✗ ERRORE: Tabella availability_slot NON esiste'
  END AS test_result;

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
      AND table_name = 'booking' 
      AND column_name = 'availability_slot_id'
    )
    THEN '✓ Campo availability_slot_id aggiunto a booking'
    ELSE '✗ ERRORE: Campo availability_slot_id NON presente in booking'
  END AS test_result;

-- TEST 2: Crea availability slots di test
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
    RAISE NOTICE 'ATTENZIONE: Nessun experience trovato';
  ELSE
    -- Crea slot con time slot
    INSERT INTO public.availability_slot (
      product_id, product_type, date, time_slot, end_time,
      max_adults, max_dogs, booked_adults, booked_dogs
    ) VALUES (
      test_experience_id, 'experience', 
      CURRENT_DATE + INTERVAL '7 days',
      '10:00:00', '13:00:00',
      10, 5, 0, 0
    ) RETURNING id INTO slot_id;
    
    RAISE NOTICE '✓ Creato slot con time slot: %', slot_id;
    
    -- Crea slot full-day
    INSERT INTO public.availability_slot (
      product_id, product_type, date, time_slot, end_time,
      max_adults, max_dogs, booked_adults, booked_dogs
    ) VALUES (
      test_experience_id, 'experience',
      CURRENT_DATE + INTERVAL '8 days',
      NULL, NULL,
      15, 10, 0, 0
    );
    
    RAISE NOTICE '✓ Creato slot full-day';
  END IF;
  
  -- Trova un class esistente
  SELECT id INTO test_class_id FROM public.class LIMIT 1;
  IF test_class_id IS NOT NULL THEN
    INSERT INTO public.availability_slot (
      product_id, product_type, date, time_slot, end_time,
      max_adults, max_dogs, booked_adults, booked_dogs
    ) VALUES (
      test_class_id, 'class',
      CURRENT_DATE + INTERVAL '10 days',
      '09:00:00', '11:00:00',
      12, 6, 0, 0
    );
    RAISE NOTICE '✓ Creato slot per class';
  END IF;
  
  -- Trova un trip esistente
  SELECT id INTO test_trip_id FROM public.trip LIMIT 1;
  IF test_trip_id IS NOT NULL THEN
    INSERT INTO public.availability_slot (
      product_id, product_type, date, time_slot, end_time,
      max_adults, max_dogs, booked_adults, booked_dogs
    ) VALUES (
      test_trip_id, 'trip',
      CURRENT_DATE + INTERVAL '14 days',
      NULL, NULL,
      20, 10, 0, 0
    );
    RAISE NOTICE '✓ Creato slot per trip';
  END IF;
END $$;

-- TEST 3: Verifica slots creati
SELECT 
  product_type,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN time_slot IS NULL THEN 1 END) as full_day_slots,
  COUNT(CASE WHEN time_slot IS NOT NULL THEN 1 END) as time_slot_slots
FROM public.availability_slot
GROUP BY product_type;

-- TEST 4: Imposta cutoff_hours
DO $$
DECLARE
  test_experience_id UUID;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  IF test_experience_id IS NOT NULL THEN
    UPDATE public.experience 
    SET cutoff_hours = 24, active = true
    WHERE id = test_experience_id;
    
    RAISE NOTICE '✓ Impostato cutoff_hours = 24 e active = true';
  END IF;
END $$;

-- TEST 5: Crea booking e verifica trigger
DO $$
DECLARE
  test_slot_id UUID;
  test_provider_id UUID;
  booking_id UUID;
  booked_before INTEGER;
  booked_after INTEGER;
BEGIN
  -- Trova slot disponibile
  SELECT id INTO test_slot_id 
  FROM public.availability_slot 
  WHERE booked_adults < max_adults 
  LIMIT 1;
  
  SELECT id INTO test_provider_id FROM public.profile LIMIT 1;
  
  IF test_slot_id IS NOT NULL AND test_provider_id IS NOT NULL THEN
    -- Leggi contatori prima
    SELECT booked_adults INTO booked_before
    FROM public.availability_slot WHERE id = test_slot_id;
    
    RAISE NOTICE 'Contatori PRIMA: adults=%', booked_before;
    
    -- Crea booking (usa number_of_humans invece di number_of_adults per provider portal)
    INSERT INTO public.booking (
      provider_id, customer_name, customer_email, product_name, product_type,
      booking_date, booking_time, number_of_humans, number_of_dogs,
      availability_slot_id, status
    ) VALUES (
      test_provider_id, 'Test Customer', 'test@example.com', 'Test Product', 'experience',
      (SELECT date FROM public.availability_slot WHERE id = test_slot_id),
      (SELECT time_slot FROM public.availability_slot WHERE id = test_slot_id),
      2, 1, test_slot_id, 'pending'
    ) RETURNING id INTO booking_id;
    
    RAISE NOTICE '✓ Creato booking: %', booking_id;
    
    -- Attendi trigger
    PERFORM pg_sleep(0.5);
    
    -- Verifica contatori dopo
    SELECT booked_adults INTO booked_after
    FROM public.availability_slot WHERE id = test_slot_id;
    
    RAISE NOTICE 'Contatori DOPO: adults=%', booked_after;
    
    IF booked_after = booked_before + 2 THEN
      RAISE NOTICE '✓ TRIGGER FUNZIONA: booked_adults incrementato correttamente';
    ELSE
      RAISE NOTICE '✗ ERRORE TRIGGER: booked_adults dovrebbe essere % ma è %', booked_before + 2, booked_after;
    END IF;
    
    -- Test cancellazione
    UPDATE public.booking SET status = 'cancelled' WHERE id = booking_id;
    PERFORM pg_sleep(0.5);
    
    SELECT booked_adults INTO booked_after
    FROM public.availability_slot WHERE id = test_slot_id;
    
    IF booked_after = booked_before THEN
      RAISE NOTICE '✓ TRIGGER CANCELLAZIONE FUNZIONA: booked_adults decrementato';
    ELSE
      RAISE NOTICE '✗ ERRORE TRIGGER CANCELLAZIONE: booked_adults dovrebbe essere %', booked_before;
    END IF;
    
    -- Pulisci
    DELETE FROM public.booking WHERE id = booking_id;
    RAISE NOTICE '✓ Booking di test eliminato';
  END IF;
END $$;

-- TEST 6: Verifica funzione is_slot_available
DO $$
DECLARE
  test_experience_id UUID;
  test_date DATE;
  test_time TIME;
  is_available BOOLEAN;
BEGIN
  SELECT id INTO test_experience_id FROM public.experience LIMIT 1;
  SELECT date INTO test_date FROM public.availability_slot 
  WHERE product_id = test_experience_id LIMIT 1;
  SELECT time_slot INTO test_time FROM public.availability_slot 
  WHERE product_id = test_experience_id AND time_slot IS NOT NULL LIMIT 1;
  
  IF test_experience_id IS NOT NULL AND test_date IS NOT NULL AND test_time IS NOT NULL THEN
    SELECT public.is_slot_available(test_experience_id, 'experience', test_date, test_time) 
    INTO is_available;
    
    IF is_available THEN
      RAISE NOTICE '✓ Funzione is_slot_available: Slot disponibile';
    ELSE
      RAISE NOTICE '✗ ERRORE: Funzione is_slot_available: Slot non disponibile';
    END IF;
  END IF;
END $$;

-- TEST 7: Verifica RLS policies
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%Public can view%' THEN '✓ Policy pubblica'
    ELSE policyname
  END AS status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('experience', 'class', 'trip', 'availability_slot')
ORDER BY tablename;

-- RIEPILOGO FINALE
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
    (SELECT COUNT(*) FROM public.experience WHERE active = true) +
    (SELECT COUNT(*) FROM public.class WHERE active = true) +
    (SELECT COUNT(*) FROM public.trip WHERE active = true)
  )::TEXT;
```

## Risultati Attesi

Dopo l'esecuzione dovresti vedere:

1. ✓ Tabella availability_slot esiste
2. ✓ Campo active aggiunto a experience
3. ✓ Campo availability_slot_id aggiunto a booking
4. ✓ Creati vari availability slots
5. ✓ Trigger funzionano (contatori incrementati/decrementati)
6. ✓ Funzione is_slot_available funziona
7. ✓ RLS policies presenti

Se tutti i test mostrano ✓, il sistema backend funziona correttamente!

