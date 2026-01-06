-- ============================================
-- TEST: Quotation Table Migration
-- ============================================
-- Verifica che la tabella quotation esista con tutti i campi necessari

-- Test 1: Verifica esistenza tabella
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Table quotation does not exist';
  END IF;
  RAISE NOTICE '✅ TEST PASSED: Table quotation exists';
END $$;

-- Test 2: Verifica campi obbligatori
DO $$
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check required fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'id'
  ) THEN missing_fields := array_append(missing_fields, 'id'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'status'
  ) THEN missing_fields := array_append(missing_fields, 'status'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_name'
  ) THEN missing_fields := array_append(missing_fields, 'customer_name'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_surname'
  ) THEN missing_fields := array_append(missing_fields, 'customer_surname'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_email'
  ) THEN missing_fields := array_append(missing_fields, 'customer_email'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_phone'
  ) THEN missing_fields := array_append(missing_fields, 'customer_phone'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_address_line1'
  ) THEN missing_fields := array_append(missing_fields, 'customer_address_line1'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_address_city'
  ) THEN missing_fields := array_append(missing_fields, 'customer_address_city'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'customer_address_postal_code'
  ) THEN missing_fields := array_append(missing_fields, 'customer_address_postal_code'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'product_id'
  ) THEN missing_fields := array_append(missing_fields, 'product_id'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation' 
    AND column_name = 'total_amount'
  ) THEN missing_fields := array_append(missing_fields, 'total_amount'); END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Missing required fields: %', array_to_string(missing_fields, ', ');
  END IF;
  
  RAISE NOTICE '✅ TEST PASSED: All required fields exist';
END $$;

-- Test 3: Verifica constraint status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name LIKE '%quotation_status%'
    AND check_clause LIKE '%quote%'
    AND check_clause LIKE '%booking%'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Status constraint not found or incorrect';
  END IF;
  RAISE NOTICE '✅ TEST PASSED: Status constraint exists';
END $$;

-- Test 4: Verifica foreign key a booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'quotation'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%booking_id%'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Foreign key to booking not found';
  END IF;
  RAISE NOTICE '✅ TEST PASSED: Foreign key to booking exists';
END $$;

-- Test 5: Verifica indici
DO $$
DECLARE
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'quotation' 
    AND indexname = 'quotation_status_idx'
  ) THEN missing_indexes := array_append(missing_indexes, 'quotation_status_idx'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'quotation' 
    AND indexname = 'quotation_booking_id_idx'
  ) THEN missing_indexes := array_append(missing_indexes, 'quotation_booking_id_idx'); END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'quotation' 
    AND indexname = 'quotation_stripe_session_idx'
  ) THEN missing_indexes := array_append(missing_indexes, 'quotation_stripe_session_idx'); END IF;
  
  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Missing indexes: %', array_to_string(missing_indexes, ', ');
  END IF;
  
  RAISE NOTICE '✅ TEST PASSED: All required indexes exist';
END $$;

-- Test 6: Verifica trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND event_object_table = 'quotation'
    AND trigger_name = 'quotation_set_updated_at'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: updated_at trigger not found';
  END IF;
  RAISE NOTICE '✅ TEST PASSED: updated_at trigger exists';
END $$;

-- Test 7: Test inserimento e aggiornamento
DO $$
DECLARE
  test_quotation_id UUID;
  test_product_id UUID;
  test_slot_id UUID;
BEGIN
  -- Get a test product and slot
  SELECT id INTO test_product_id FROM public.experience LIMIT 1;
  SELECT id INTO test_slot_id FROM public.availability_slot WHERE product_id = test_product_id LIMIT 1;
  
  IF test_product_id IS NULL OR test_slot_id IS NULL THEN
    RAISE NOTICE '⚠️  SKIPPED: No test data available (product or slot)';
    RETURN;
  END IF;
  
  -- Test insert
  INSERT INTO public.quotation (
    customer_name, customer_surname, customer_email, customer_phone,
    customer_address_line1, customer_address_city, customer_address_postal_code, customer_address_country,
    product_id, product_type, product_name, availability_slot_id,
    booking_date, guests, dogs, total_amount, status
  ) VALUES (
    'Test', 'User', 'test@example.com', '+39123456789',
    'Via Test 123', 'Roma', '00100', 'IT',
    test_product_id, 'experience', 'Test Product', test_slot_id,
    CURRENT_DATE + INTERVAL '7 days', 2, 1, 100.00, 'quote'
  ) RETURNING id INTO test_quotation_id;
  
  IF test_quotation_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Insert returned no ID';
  END IF;
  
  RAISE NOTICE '✅ TEST PASSED: Insert successful, quotation_id: %', test_quotation_id;
  
  -- Test update
  UPDATE public.quotation 
  SET status = 'booking' 
  WHERE id = test_quotation_id;
  
  IF (SELECT status FROM public.quotation WHERE id = test_quotation_id) != 'booking' THEN
    RAISE EXCEPTION 'TEST FAILED: Update did not work';
  END IF;
  
  RAISE NOTICE '✅ TEST PASSED: Update successful';
  
  -- Cleanup
  DELETE FROM public.quotation WHERE id = test_quotation_id;
  RAISE NOTICE '✅ TEST PASSED: Cleanup successful';
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE '✅ ALL QUOTATION MIGRATION TESTS PASSED';
RAISE NOTICE '========================================';

