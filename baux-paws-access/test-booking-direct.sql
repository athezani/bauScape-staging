-- Script per testare direttamente la funzione create_booking_transactional
-- Crea booking di test per tutte e 3 le tipologie

-- IMPORTANTE: Prima di eseguire, devi avere:
-- 1. Prodotti esistenti (experience, class, trip)
-- 2. Availability slots esistenti
-- 3. Provider esistente

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
BEGIN
  -- Trova un'esperienza esistente
  SELECT id INTO v_experience_id FROM experience WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  -- Trova o crea uno slot di disponibilità
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'experience' 
  AND product_id = v_experience_id
  LIMIT 1;
  
  IF v_experience_id IS NULL OR v_provider_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Experience: Prodotti o provider non trovati, skip';
  ELSIF v_slot_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Experience: Slot non trovato, skip';
  ELSE
    -- Chiama la funzione
    SELECT booking_id, success, error_message 
    INTO v_booking_id, v_success, v_error
    FROM create_booking_transactional(
      p_idempotency_key := gen_random_uuid(),
      p_product_type := 'experience',
      p_provider_id := v_provider_id,
      p_availability_slot_id := v_slot_id,
      p_stripe_checkout_session_id := 'cs_test_experience_' || gen_random_uuid()::text,
      p_stripe_payment_intent_id := 'pi_test_experience_' || gen_random_uuid()::text,
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
      RAISE NOTICE '✅ Test Experience: Booking creato - ID: %', v_booking_id;
      
      -- Verifica idempotency_key
      IF EXISTS (SELECT 1 FROM booking WHERE id = v_booking_id AND idempotency_key IS NOT NULL) THEN
        RAISE NOTICE '✅ Test Experience: Idempotency key presente';
      ELSE
        RAISE WARNING '❌ Test Experience: Idempotency key MANCANTE!';
      END IF;
    ELSE
      RAISE WARNING '❌ Test Experience: Errore - %', v_error;
    END IF;
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
BEGIN
  SELECT id INTO v_class_id FROM class WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'class' 
  AND product_id = v_class_id
  LIMIT 1;
  
  IF v_class_id IS NULL OR v_provider_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Class: Prodotti o provider non trovati, skip';
  ELSIF v_slot_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Class: Slot non trovato, skip';
  ELSE
    SELECT booking_id, success, error_message 
    INTO v_booking_id, v_success, v_error
    FROM create_booking_transactional(
      p_idempotency_key := gen_random_uuid(),
      p_product_type := 'class',
      p_provider_id := v_provider_id,
      p_availability_slot_id := v_slot_id,
      p_stripe_checkout_session_id := 'cs_test_class_' || gen_random_uuid()::text,
      p_stripe_payment_intent_id := 'pi_test_class_' || gen_random_uuid()::text,
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
      RAISE NOTICE '✅ Test Class: Booking creato - ID: %', v_booking_id;
      
      IF EXISTS (SELECT 1 FROM booking WHERE id = v_booking_id AND idempotency_key IS NOT NULL) THEN
        RAISE NOTICE '✅ Test Class: Idempotency key presente';
      ELSE
        RAISE WARNING '❌ Test Class: Idempotency key MANCANTE!';
      END IF;
    ELSE
      RAISE WARNING '❌ Test Class: Errore - %', v_error;
    END IF;
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
BEGIN
  SELECT id INTO v_trip_id FROM trip WHERE active = true LIMIT 1;
  SELECT id INTO v_provider_id FROM profile WHERE active = true LIMIT 1;
  
  SELECT id INTO v_slot_id 
  FROM availability_slot 
  WHERE product_type = 'trip' 
  AND product_id = v_trip_id
  LIMIT 1;
  
  IF v_trip_id IS NULL OR v_provider_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Trip: Prodotti o provider non trovati, skip';
  ELSIF v_slot_id IS NULL THEN
    RAISE NOTICE '⚠️  Test Trip: Slot non trovato, skip';
  ELSE
    SELECT booking_id, success, error_message 
    INTO v_booking_id, v_success, v_error
    FROM create_booking_transactional(
      p_idempotency_key := gen_random_uuid(),
      p_product_type := 'trip',
      p_provider_id := v_provider_id,
      p_availability_slot_id := v_slot_id,
      p_stripe_checkout_session_id := 'cs_test_trip_' || gen_random_uuid()::text,
      p_stripe_payment_intent_id := 'pi_test_trip_' || gen_random_uuid()::text,
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
      RAISE NOTICE '✅ Test Trip: Booking creato - ID: %', v_booking_id;
      
      IF EXISTS (SELECT 1 FROM booking WHERE id = v_booking_id AND idempotency_key IS NOT NULL) THEN
        RAISE NOTICE '✅ Test Trip: Idempotency key presente';
      ELSE
        RAISE WARNING '❌ Test Trip: Idempotency key MANCANTE!';
      END IF;
    ELSE
      RAISE WARNING '❌ Test Trip: Errore - %', v_error;
    END IF;
  END IF;
END $$;

-- ============================================
-- VERIFICA FINALE
-- ============================================
SELECT 
  '📊 Riepilogo Test' as info,
  COUNT(*) FILTER (WHERE product_type = 'experience' AND idempotency_key IS NOT NULL) as experience_ok,
  COUNT(*) FILTER (WHERE product_type = 'class' AND idempotency_key IS NOT NULL) as class_ok,
  COUNT(*) FILTER (WHERE product_type = 'trip' AND idempotency_key IS NOT NULL) as trip_ok,
  COUNT(*) FILTER (WHERE idempotency_key IS NULL) as senza_key
FROM booking
WHERE stripe_checkout_session_id LIKE 'cs_test_%'
AND created_at > NOW() - INTERVAL '1 hour';

-- Mostra i booking di test creati
SELECT 
  id,
  product_type,
  order_number,
  idempotency_key IS NOT NULL as has_idempotency_key,
  idempotency_key,
  created_at
FROM booking
WHERE stripe_checkout_session_id LIKE 'cs_test_%'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;




