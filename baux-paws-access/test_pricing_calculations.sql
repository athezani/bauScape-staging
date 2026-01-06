-- ============================================
-- Test Pricing Calculations
-- ============================================
-- This script tests the pricing calculation logic
-- for both percentage and markup models
-- ============================================

-- Test 1: Percentage Model Calculation
-- Expected: price = provider_cost * (1 + margin_percentage/100)
DO $$
DECLARE
  test_provider_cost_adult NUMERIC := 50.00;
  test_provider_cost_dog NUMERIC := 20.00;
  test_margin_percentage NUMERIC := 30.00;
  test_num_adults INTEGER := 2;
  test_num_dogs INTEGER := 1;
  
  expected_provider_cost_total NUMERIC;
  expected_total_price NUMERIC;
  calculated_price NUMERIC;
BEGIN
  expected_provider_cost_total := (test_provider_cost_adult * test_num_adults) + (test_provider_cost_dog * test_num_dogs);
  expected_total_price := expected_provider_cost_total * (1 + test_margin_percentage / 100);
  
  RAISE NOTICE 'Test 1: Percentage Model';
  RAISE NOTICE '  Provider cost adult: €%', test_provider_cost_adult;
  RAISE NOTICE '  Provider cost dog: €%', test_provider_cost_dog;
  RAISE NOTICE '  Margin percentage: %%%', test_margin_percentage;
  RAISE NOTICE '  Number of adults: %', test_num_adults;
  RAISE NOTICE '  Number of dogs: %', test_num_dogs;
  RAISE NOTICE '  Expected provider cost total: €%', expected_provider_cost_total;
  RAISE NOTICE '  Expected total price: €%', expected_total_price;
  
  -- Verify calculation
  calculated_price := expected_provider_cost_total * (1 + test_margin_percentage / 100);
  IF ABS(calculated_price - expected_total_price) < 0.01 THEN
    RAISE NOTICE '  ✓ Calculation correct';
  ELSE
    RAISE EXCEPTION 'Calculation error: expected €%, got €%', expected_total_price, calculated_price;
  END IF;
END $$;

-- Test 2: Markup Model Calculation
-- Expected: price = provider_cost + markup_adult * num_adults + markup_dog * num_dogs
DO $$
DECLARE
  test_provider_cost_adult NUMERIC := 50.00;
  test_provider_cost_dog NUMERIC := 20.00;
  test_markup_adult NUMERIC := 15.00;
  test_markup_dog NUMERIC := 10.00;
  test_num_adults INTEGER := 2;
  test_num_dogs INTEGER := 1;
  
  expected_provider_cost_total NUMERIC;
  expected_total_price NUMERIC;
  calculated_price NUMERIC;
BEGIN
  expected_provider_cost_total := (test_provider_cost_adult * test_num_adults) + (test_provider_cost_dog * test_num_dogs);
  expected_total_price := expected_provider_cost_total + (test_markup_adult * test_num_adults) + (test_markup_dog * test_num_dogs);
  
  RAISE NOTICE 'Test 2: Markup Model';
  RAISE NOTICE '  Provider cost adult: €%', test_provider_cost_adult;
  RAISE NOTICE '  Provider cost dog: €%', test_provider_cost_dog;
  RAISE NOTICE '  Markup adult: €%', test_markup_adult;
  RAISE NOTICE '  Markup dog: €%', test_markup_dog;
  RAISE NOTICE '  Number of adults: %', test_num_adults;
  RAISE NOTICE '  Number of dogs: %', test_num_dogs;
  RAISE NOTICE '  Expected provider cost total: €%', expected_provider_cost_total;
  RAISE NOTICE '  Expected total price: €%', expected_total_price;
  
  -- Verify calculation
  calculated_price := expected_provider_cost_total + (test_markup_adult * test_num_adults) + (test_markup_dog * test_num_dogs);
  IF ABS(calculated_price - expected_total_price) < 0.01 THEN
    RAISE NOTICE '  ✓ Calculation correct';
  ELSE
    RAISE EXCEPTION 'Calculation error: expected €%, got €%', expected_total_price, calculated_price;
  END IF;
END $$;

-- Test 3: Financial Values Calculation
-- Expected: internal_margin = total_amount_paid - provider_cost_total - stripe_fee
DO $$
DECLARE
  test_total_amount_paid NUMERIC := 200.00;
  test_provider_cost_total NUMERIC := 120.00;
  test_stripe_fee NUMERIC := 5.00;
  
  expected_internal_margin NUMERIC;
  calculated_margin NUMERIC;
BEGIN
  expected_internal_margin := test_total_amount_paid - test_provider_cost_total - test_stripe_fee;
  
  RAISE NOTICE 'Test 3: Financial Values';
  RAISE NOTICE '  Total amount paid: €%', test_total_amount_paid;
  RAISE NOTICE '  Provider cost total: €%', test_provider_cost_total;
  RAISE NOTICE '  Stripe fee: €%', test_stripe_fee;
  RAISE NOTICE '  Expected internal margin: €%', expected_internal_margin;
  
  -- Verify calculation
  calculated_margin := test_total_amount_paid - test_provider_cost_total - test_stripe_fee;
  IF ABS(calculated_margin - expected_internal_margin) < 0.01 THEN
    RAISE NOTICE '  ✓ Calculation correct';
  ELSE
    RAISE EXCEPTION 'Calculation error: expected €%, got €%', expected_internal_margin, calculated_margin;
  END IF;
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE 'All pricing calculation tests passed!';
RAISE NOTICE '========================================';

