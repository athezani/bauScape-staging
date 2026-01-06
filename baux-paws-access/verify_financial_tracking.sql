-- ============================================
-- Verification Script for Financial Tracking
-- ============================================
-- This script verifies that all migrations have been applied correctly
-- and that the financial tracking system is working properly
-- ============================================

-- 1. Verify pricing_model enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_model') THEN
    RAISE EXCEPTION 'pricing_model enum does not exist';
  ELSE
    RAISE NOTICE '✓ pricing_model enum exists';
  END IF;
END $$;

-- 2. Verify product tables have new fields
DO $$
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'experience' 
    AND column_name = 'pricing_model'
  ) THEN
    missing_fields := array_append(missing_fields, 'experience.pricing_model');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'experience' 
    AND column_name = 'provider_cost_adult_base'
  ) THEN
    missing_fields := array_append(missing_fields, 'experience.provider_cost_adult_base');
  END IF;
  
  -- Check class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'class' 
    AND column_name = 'pricing_model'
  ) THEN
    missing_fields := array_append(missing_fields, 'class.pricing_model');
  END IF;
  
  -- Check trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trip' 
    AND column_name = 'pricing_model'
  ) THEN
    missing_fields := array_append(missing_fields, 'trip.pricing_model');
  END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE EXCEPTION 'Missing fields: %', array_to_string(missing_fields, ', ');
  ELSE
    RAISE NOTICE '✓ All product tables have required pricing fields';
  END IF;
END $$;

-- 3. Verify booking table has financial fields
DO $$
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'provider_cost_total'
  ) THEN
    missing_fields := array_append(missing_fields, 'booking.provider_cost_total');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'stripe_fee'
  ) THEN
    missing_fields := array_append(missing_fields, 'booking.stripe_fee');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'internal_margin'
  ) THEN
    missing_fields := array_append(missing_fields, 'booking.internal_margin');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'net_revenue'
  ) THEN
    missing_fields := array_append(missing_fields, 'booking.net_revenue');
  END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE EXCEPTION 'Missing booking fields: %', array_to_string(missing_fields, ', ');
  ELSE
    RAISE NOTICE '✓ All booking financial fields exist';
  END IF;
END $$;

-- 4. Verify products have pricing data populated
DO $$
DECLARE
  exp_count INTEGER;
  class_count INTEGER;
  trip_count INTEGER;
  exp_without_pricing INTEGER;
  class_without_pricing INTEGER;
  trip_without_pricing INTEGER;
BEGIN
  -- Count experiences with pricing model
  SELECT COUNT(*) INTO exp_count FROM public.experience WHERE active = true;
  SELECT COUNT(*) INTO exp_without_pricing 
  FROM public.experience 
  WHERE active = true 
    AND (pricing_model IS NULL OR provider_cost_adult_base IS NULL);
  
  -- Count classes with pricing model
  SELECT COUNT(*) INTO class_count FROM public.class WHERE active = true;
  SELECT COUNT(*) INTO class_without_pricing 
  FROM public.class 
  WHERE active = true 
    AND (pricing_model IS NULL OR provider_cost_adult_base IS NULL);
  
  -- Count trips with pricing model
  SELECT COUNT(*) INTO trip_count FROM public.trip WHERE active = true;
  SELECT COUNT(*) INTO trip_without_pricing 
  FROM public.trip 
  WHERE active = true 
    AND (pricing_model IS NULL OR provider_cost_adult_base IS NULL);
  
  RAISE NOTICE 'Product pricing status:';
  RAISE NOTICE '  Experiences: % total, % without pricing', exp_count, exp_without_pricing;
  RAISE NOTICE '  Classes: % total, % without pricing', class_count, class_without_pricing;
  RAISE NOTICE '  Trips: % total, % without pricing', trip_count, trip_without_pricing;
  
  IF exp_without_pricing > 0 OR class_without_pricing > 0 OR trip_without_pricing > 0 THEN
    RAISE WARNING 'Some products are missing pricing data. Run migration 20250115000002_populate_products_with_placeholder_values.sql';
  ELSE
    RAISE NOTICE '✓ All active products have pricing data';
  END IF;
END $$;

-- 5. Verify function signature includes financial fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_booking_transactional'
      AND pg_get_function_arguments(p.oid) LIKE '%p_provider_cost_total%'
  ) THEN
    RAISE EXCEPTION 'create_booking_transactional function does not include financial fields';
  ELSE
    RAISE NOTICE '✓ create_booking_transactional function includes financial fields';
  END IF;
END $$;

-- 6. Show sample products with different pricing models
SELECT 
  'experience' as product_type,
  id,
  name,
  pricing_model,
  margin_percentage,
  markup_adult,
  markup_dog,
  provider_cost_adult_base,
  provider_cost_dog_base
FROM public.experience
WHERE active = true
ORDER BY pricing_model, created_at
LIMIT 5;

SELECT 
  'class' as product_type,
  id,
  name,
  pricing_model,
  margin_percentage,
  markup_adult,
  markup_dog,
  provider_cost_adult_base,
  provider_cost_dog_base
FROM public.class
WHERE active = true
ORDER BY pricing_model, created_at
LIMIT 5;

SELECT 
  'trip' as product_type,
  id,
  name,
  pricing_model,
  margin_percentage,
  markup_adult,
  markup_dog,
  provider_cost_adult_base,
  provider_cost_dog_base
FROM public.trip
WHERE active = true
ORDER BY pricing_model, created_at
LIMIT 5;

-- 7. Show recent bookings with financial data (if any)
SELECT 
  id,
  order_number,
  product_name,
  total_amount_paid,
  provider_cost_total,
  stripe_fee,
  internal_margin,
  net_revenue,
  created_at
FROM public.booking
WHERE provider_cost_total IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

RAISE NOTICE '========================================';
RAISE NOTICE 'Verification complete!';
RAISE NOTICE '========================================';

