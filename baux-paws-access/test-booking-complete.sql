-- ============================================
-- TEST COMPLETO: Crea Booking per Tutte le Tipologie
-- Verifica che abbiano idempotency_key
-- ============================================

-- Pulisci booking di test precedenti (opzionale)
-- DELETE FROM booking WHERE stripe_checkout_session_id LIKE 'cs_test_%';

-- ============================================
-- TEST 1: Experience Booking
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_success BOOLEAN;
  v_error TEXT;
  v_experience_id UUID;
  v_slot_id UUID;
  v_provider_id UUID;
  v_idempotency_key UUID := gen_random_uuid();
  v_has_key BOOLEAN;
BEGIN
  RAISE NOTICE '🧪 TEST 1: Experience Booking';
  RAISE NOTICE '   Idempotency Key: %', v_idempotency_key;
  
  -- Trova un'esperienza esistente
  SELECT id INTO v_experience_id FROM experience WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  IF v_experience_id IS NULL THEN
    RAISE NOTICE '⚠️  Experience non trovata, creando una di test...';
    INSERT INTO experience (name, description, active, provider_id, price_adult_base, price_dog_base)
    VALUES ('Test Experience', 'Test Experience for booking', true, v_provider_id, 50.00, 25.00)
    RETURNING id INTO v_experience_id;
  END IF;
  
  IF v_provider_id IS NULL THEN
    RAISE NOTICE '⚠️  Provider non trovato, usando il primo disponibile...';
    SELECT id INTO v_provider_id FROM profile LIMIT 1;
  END IF;
  
  -- Trova o crea uno slot di disponibilità
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'experience' 
  AND product_id = v_experience_id
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE NOTICE '   Creando slot di disponibilità...';
    INSERT INTO availability_slot (product_id, product_type, date, max_adults, max_dogs, booked_adults, booked_dogs)
    VALUES (v_experience_id, 'experience', CURRENT_DATE + INTERVAL '7 days', 10, 5, 0, 0)
    RETURNING id INTO v_slot_id;
  END IF;
  
  -- Chiama la funzione
  SELECT booking_id, success, error_message 
  INTO v_booking_id, v_success, v_error
  FROM create_booking_transactional(
    p_idempotency_key := v_idempotency_key,
    p_product_type := 'experience',
    p_provider_id := v_provider_id,
    p_availability_slot_id := v_slot_id,
    p_stripe_checkout_session_id := 'cs_test_experience_' || substr(gen_random_uuid()::text, 1, 20),
    p_stripe_payment_intent_id := 'pi_test_experience_' || substr(gen_random_uuid()::text, 1, 20),
    p_order_number := 'EXP' || substr(gen_random_uuid()::text, 1, 5),
    p_booking_date := CURRENT_DATE + INTERVAL '7 days',
    p_booking_time := NOW(),
    p_number_of_adults := 2,
    p_number_of_dogs := 1,
    p_total_amount_paid := 100.00,
    p_customer_email := 'test-experience@example.com',
    p_customer_name := 'Test Experience',
    p_product_name := 'Test Experience Booking'
  );
  
  IF v_success THEN
    RAISE NOTICE '✅ Booking creato - ID: %', v_booking_id;
    
    -- Verifica idempotency_key
    SELECT (idempotency_key IS NOT NULL) INTO v_has_key
    FROM booking WHERE id = v_booking_id;
    
    IF v_has_key THEN
      RAISE NOTICE '✅ Idempotency key presente';
    ELSE
      RAISE WARNING '❌ Idempotency key MANCANTE!';
      RAISE WARNING '   Expected: %', v_idempotency_key;
      RAISE WARNING '   Actual: NULL';
    END IF;
  ELSE
    RAISE WARNING '❌ Errore: %', v_error;
  END IF;
END $$;

-- ============================================
-- TEST 2: Class Booking
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_success BOOLEAN;
  v_error TEXT;
  v_class_id UUID;
  v_slot_id UUID;
  v_provider_id UUID;
  v_idempotency_key UUID := gen_random_uuid();
  v_has_key BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 2: Class Booking';
  RAISE NOTICE '   Idempotency Key: %', v_idempotency_key;
  
  SELECT id INTO v_class_id FROM class WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  IF v_class_id IS NULL THEN
    RAISE NOTICE '⚠️  Class non trovata, creando una di test...';
    INSERT INTO class (name, description, active, provider_id, price_adult_base, price_dog_base)
    VALUES ('Test Class', 'Test Class for booking', true, v_provider_id, 30.00, 15.00)
    RETURNING id INTO v_class_id;
  END IF;
  
  IF v_provider_id IS NULL THEN
    SELECT id INTO v_provider_id FROM profile LIMIT 1;
  END IF;
  
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'class' 
  AND product_id = v_class_id
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    INSERT INTO availability_slot (product_id, product_type, date, max_adults, max_dogs, booked_adults, booked_dogs)
    VALUES (v_class_id, 'class', CURRENT_DATE + INTERVAL '7 days', 10, 5, 0, 0)
    RETURNING id INTO v_slot_id;
  END IF;
  
  SELECT booking_id, success, error_message 
  INTO v_booking_id, v_success, v_error
  FROM create_booking_transactional(
    p_idempotency_key := v_idempotency_key,
    p_product_type := 'class',
    p_provider_id := v_provider_id,
    p_availability_slot_id := v_slot_id,
    p_stripe_checkout_session_id := 'cs_test_class_' || substr(gen_random_uuid()::text, 1, 20),
    p_stripe_payment_intent_id := 'pi_test_class_' || substr(gen_random_uuid()::text, 1, 20),
    p_order_number := 'CLS' || substr(gen_random_uuid()::text, 1, 5),
    p_booking_date := CURRENT_DATE + INTERVAL '7 days',
    p_booking_time := NOW(),
    p_number_of_adults := 1,
    p_number_of_dogs := 0,
    p_total_amount_paid := 50.00,
    p_customer_email := 'test-class@example.com',
    p_customer_name := 'Test Class',
    p_product_name := 'Test Class Booking'
  );
  
  IF v_success THEN
    RAISE NOTICE '✅ Booking creato - ID: %', v_booking_id;
    
    SELECT (idempotency_key IS NOT NULL) INTO v_has_key
    FROM booking WHERE id = v_booking_id;
    
    IF v_has_key THEN
      RAISE NOTICE '✅ Idempotency key presente';
    ELSE
      RAISE WARNING '❌ Idempotency key MANCANTE!';
      RAISE WARNING '   Expected: %', v_idempotency_key;
    END IF;
  ELSE
    RAISE WARNING '❌ Errore: %', v_error;
  END IF;
END $$;

-- ============================================
-- TEST 3: Trip Booking
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_success BOOLEAN;
  v_error TEXT;
  v_trip_id UUID;
  v_slot_id UUID;
  v_provider_id UUID;
  v_idempotency_key UUID := gen_random_uuid();
  v_has_key BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 3: Trip Booking';
  RAISE NOTICE '   Idempotency Key: %', v_idempotency_key;
  
  SELECT id INTO v_trip_id FROM trip WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  IF v_trip_id IS NULL THEN
    RAISE NOTICE '⚠️  Trip non trovato, creando uno di test...';
    INSERT INTO trip (name, description, active, provider_id, price_adult_base, price_dog_base, start_date, end_date)
    VALUES ('Test Trip', 'Test Trip for booking', true, v_provider_id, 200.00, 100.00, 
            CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '37 days')
    RETURNING id INTO v_trip_id;
  END IF;
  
  IF v_provider_id IS NULL THEN
    SELECT id INTO v_provider_id FROM profile LIMIT 1;
  END IF;
  
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'trip' 
  AND product_id = v_trip_id
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    INSERT INTO availability_slot (product_id, product_type, date, max_adults, max_dogs, booked_adults, booked_dogs)
    VALUES (v_trip_id, 'trip', CURRENT_DATE + INTERVAL '30 days', 10, 5, 0, 0)
    RETURNING id INTO v_slot_id;
  END IF;
  
  SELECT booking_id, success, error_message 
  INTO v_booking_id, v_success, v_error
  FROM create_booking_transactional(
    p_idempotency_key := v_idempotency_key,
    p_product_type := 'trip',
    p_provider_id := v_provider_id,
    p_availability_slot_id := v_slot_id,
    p_stripe_checkout_session_id := 'cs_test_trip_' || substr(gen_random_uuid()::text, 1, 20),
    p_stripe_payment_intent_id := 'pi_test_trip_' || substr(gen_random_uuid()::text, 1, 20),
    p_order_number := 'TRP' || substr(gen_random_uuid()::text, 1, 5),
    p_booking_date := CURRENT_DATE + INTERVAL '30 days',
    p_booking_time := NOW(),
    p_trip_start_date := CURRENT_DATE + INTERVAL '30 days',
    p_trip_end_date := CURRENT_DATE + INTERVAL '37 days',
    p_number_of_adults := 2,
    p_number_of_dogs := 0,
    p_total_amount_paid := 500.00,
    p_customer_email := 'test-trip@example.com',
    p_customer_name := 'Test Trip',
    p_product_name := 'Test Trip Booking'
  );
  
  IF v_success THEN
    RAISE NOTICE '✅ Booking creato - ID: %', v_booking_id;
    
    SELECT (idempotency_key IS NOT NULL) INTO v_has_key
    FROM booking WHERE id = v_booking_id;
    
    IF v_has_key THEN
      RAISE NOTICE '✅ Idempotency key presente';
    ELSE
      RAISE WARNING '❌ Idempotency key MANCANTE!';
      RAISE WARNING '   Expected: %', v_idempotency_key;
    END IF;
  ELSE
    RAISE WARNING '❌ Errore: %', v_error;
  END IF;
END $$;

-- ============================================
-- VERIFICA FINALE
-- ============================================
RAISE NOTICE '';
RAISE NOTICE '📊 Riepilogo Test';
RAISE NOTICE '================';

SELECT 
  '📊 Riepilogo' as info,
  COUNT(*) FILTER (WHERE product_type = 'experience' AND idempotency_key IS NOT NULL) as experience_ok,
  COUNT(*) FILTER (WHERE product_type = 'class' AND idempotency_key IS NOT NULL) as class_ok,
  COUNT(*) FILTER (WHERE product_type = 'trip' AND idempotency_key IS NOT NULL) as trip_ok,
  COUNT(*) FILTER (WHERE idempotency_key IS NULL) as senza_key,
  COUNT(*) as total_test_booking
FROM booking
WHERE stripe_checkout_session_id LIKE 'cs_test_%'
AND created_at > NOW() - INTERVAL '10 minutes';

-- Mostra i booking di test creati
SELECT 
  id,
  product_type,
  order_number,
  CASE 
    WHEN idempotency_key IS NOT NULL THEN '✅ OK'
    ELSE '❌ NULL'
  END as status,
  idempotency_key,
  created_at
FROM booking
WHERE stripe_checkout_session_id LIKE 'cs_test_%'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;




