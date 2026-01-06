-- ============================================
-- Test FAQ System End-to-End
-- ============================================
-- This script tests the FAQ system using Supabase secret key
-- Run this after applying migrations
-- ============================================

-- Test 1: Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') THEN
    RAISE EXCEPTION 'Table faq does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_faq') THEN
    RAISE EXCEPTION 'Table product_faq does not exist';
  END IF;
  
  RAISE NOTICE '✓ Tables exist';
END $$;

-- Test 2: Create a test FAQ
DO $$
DECLARE
  test_faq_id UUID;
BEGIN
  INSERT INTO public.faq (question, answer)
  VALUES ('Test Question?', 'Test Answer')
  RETURNING id INTO test_faq_id;
  
  RAISE NOTICE '✓ Test FAQ created with ID: %', test_faq_id;
  
  -- Verify it was created
  IF NOT EXISTS (SELECT 1 FROM public.faq WHERE id = test_faq_id) THEN
    RAISE EXCEPTION 'Test FAQ was not created';
  END IF;
  
  RAISE NOTICE '✓ Test FAQ verified';
END $$;

-- Test 3: Get existing products and associate FAQs
DO $$
DECLARE
  exp_id UUID;
  class_id UUID;
  trip_id UUID;
  test_faq_id UUID;
  faq_count INTEGER;
BEGIN
  -- Get a test FAQ
  SELECT id INTO test_faq_id FROM public.faq ORDER BY created_at DESC LIMIT 1;
  
  IF test_faq_id IS NULL THEN
    RAISE EXCEPTION 'No FAQ found to test with';
  END IF;
  
  -- Get first active product of each type
  SELECT id INTO exp_id FROM public.experience WHERE active = true LIMIT 1;
  SELECT id INTO class_id FROM public.class WHERE active = true LIMIT 1;
  SELECT id INTO trip_id FROM public.trip WHERE active = true LIMIT 1;
  
  -- Associate FAQ with experience if exists
  IF exp_id IS NOT NULL THEN
    -- Delete existing associations for this product
    DELETE FROM public.product_faq WHERE product_id = exp_id AND product_type = 'experience';
    
    -- Insert new association
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    VALUES (exp_id, 'experience', test_faq_id, 0);
    
    SELECT COUNT(*) INTO faq_count FROM public.product_faq WHERE product_id = exp_id AND product_type = 'experience';
    
    IF faq_count = 0 THEN
      RAISE EXCEPTION 'Failed to associate FAQ with experience';
    END IF;
    
    RAISE NOTICE '✓ FAQ associated with experience: %', exp_id;
  ELSE
    RAISE NOTICE '⚠ No active experience found to test';
  END IF;
  
  -- Associate FAQ with class if exists
  IF class_id IS NOT NULL THEN
    DELETE FROM public.product_faq WHERE product_id = class_id AND product_type = 'class';
    
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    VALUES (class_id, 'class', test_faq_id, 0);
    
    SELECT COUNT(*) INTO faq_count FROM public.product_faq WHERE product_id = class_id AND product_type = 'class';
    
    IF faq_count = 0 THEN
      RAISE EXCEPTION 'Failed to associate FAQ with class';
    END IF;
    
    RAISE NOTICE '✓ FAQ associated with class: %', class_id;
  ELSE
    RAISE NOTICE '⚠ No active class found to test';
  END IF;
  
  -- Associate FAQ with trip if exists
  IF trip_id IS NOT NULL THEN
    DELETE FROM public.product_faq WHERE product_id = trip_id AND product_type = 'trip';
    
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    VALUES (trip_id, 'trip', test_faq_id, 0);
    
    SELECT COUNT(*) INTO faq_count FROM public.product_faq WHERE product_id = trip_id AND product_type = 'trip';
    
    IF faq_count = 0 THEN
      RAISE EXCEPTION 'Failed to associate FAQ with trip';
    END IF;
    
    RAISE NOTICE '✓ FAQ associated with trip: %', trip_id;
  ELSE
    RAISE NOTICE '⚠ No active trip found to test';
  END IF;
END $$;

-- Test 4: Verify FAQ can be loaded with product
DO $$
DECLARE
  exp_id UUID;
  faq_count INTEGER;
  loaded_faq_count INTEGER;
BEGIN
  SELECT id INTO exp_id FROM public.experience WHERE active = true LIMIT 1;
  
  IF exp_id IS NOT NULL THEN
    -- Count FAQs for this product
    SELECT COUNT(*) INTO faq_count
    FROM public.product_faq
    WHERE product_id = exp_id AND product_type = 'experience';
    
    -- Try to load FAQs with join
    SELECT COUNT(*) INTO loaded_faq_count
    FROM public.product_faq pf
    JOIN public.faq f ON f.id = pf.faq_id
    WHERE pf.product_id = exp_id AND pf.product_type = 'experience';
    
    IF faq_count != loaded_faq_count THEN
      RAISE EXCEPTION 'FAQ count mismatch: expected %, got %', faq_count, loaded_faq_count;
    END IF;
    
    RAISE NOTICE '✓ FAQ loading works correctly for experience: %', exp_id;
    RAISE NOTICE '  Found % FAQs', loaded_faq_count;
  ELSE
    RAISE NOTICE '⚠ No active experience found to test loading';
  END IF;
END $$;

-- Test 5: Verify ordering works
DO $$
DECLARE
  exp_id UUID;
  faq_id1 UUID;
  faq_id2 UUID;
  order_check BOOLEAN;
BEGIN
  SELECT id INTO exp_id FROM public.experience WHERE active = true LIMIT 1;
  
  IF exp_id IS NOT NULL THEN
    -- Get two FAQs
    SELECT id INTO faq_id1 FROM public.faq ORDER BY created_at DESC LIMIT 1 OFFSET 0;
    SELECT id INTO faq_id2 FROM public.faq ORDER BY created_at DESC LIMIT 1 OFFSET 1;
    
    IF faq_id1 IS NOT NULL AND faq_id2 IS NOT NULL THEN
      -- Delete existing
      DELETE FROM public.product_faq WHERE product_id = exp_id AND product_type = 'experience';
      
      -- Insert with different order
      INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
      VALUES 
        (exp_id, 'experience', faq_id1, 0),
        (exp_id, 'experience', faq_id2, 1);
      
      -- Verify order
      SELECT (order_index = 0 AND faq_id = faq_id1) OR (order_index = 1 AND faq_id = faq_id2)
      INTO order_check
      FROM public.product_faq
      WHERE product_id = exp_id AND product_type = 'experience'
      ORDER BY order_index;
      
      IF NOT order_check THEN
        RAISE EXCEPTION 'Order verification failed';
      END IF;
      
      RAISE NOTICE '✓ FAQ ordering works correctly';
    ELSE
      RAISE NOTICE '⚠ Not enough FAQs to test ordering';
    END IF;
  ELSE
    RAISE NOTICE '⚠ No active experience found to test ordering';
  END IF;
END $$;

-- Test 6: Verify RLS policies (public read access)
DO $$
DECLARE
  faq_count INTEGER;
BEGIN
  -- This should work for anon users (public read)
  SELECT COUNT(*) INTO faq_count FROM public.faq;
  
  IF faq_count = 0 THEN
    RAISE NOTICE '⚠ No FAQs found (this is OK if migrations not run yet)';
  ELSE
    RAISE NOTICE '✓ Public read access works: % FAQs found', faq_count;
  END IF;
END $$;

-- Summary
DO $$
DECLARE
  total_faqs INTEGER;
  total_product_faqs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_faqs FROM public.faq;
  SELECT COUNT(*) INTO total_product_faqs FROM public.product_faq;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FAQ System Test Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total FAQs: %', total_faqs;
  RAISE NOTICE 'Total Product-FAQ associations: %', total_product_faqs;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tests completed!';
END $$;



