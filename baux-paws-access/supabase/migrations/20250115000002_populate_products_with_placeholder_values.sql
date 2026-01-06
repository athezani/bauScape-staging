-- ============================================
-- Populate Products with Placeholder Values
-- ============================================
-- This migration populates existing products with mixed placeholder values
-- to test all different pricing model variants
-- ============================================

DO $$
DECLARE
  product_count INTEGER;
  updated_count INTEGER;
  i INTEGER := 0;
BEGIN
  -- Update experiences with mixed pricing models
  -- 50% percentage model, 50% markup model
  FOR product_count IN 
    SELECT COUNT(*) FROM public.experience WHERE active = true
  LOOP
    -- Set percentage model for first half
    UPDATE public.experience
    SET 
      pricing_model = 'percentage',
      margin_percentage = 25.00 + (random() * 15.00), -- Between 25% and 40%
      markup_adult = NULL,
      markup_dog = NULL,
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.70), -- 70% of selling price as cost
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.70)
    WHERE active = true 
      AND id IN (
        SELECT id FROM public.experience 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR margin_percentage IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % experiences with percentage model', updated_count;
    
    -- Set markup model for second half
    UPDATE public.experience
    SET 
      pricing_model = 'markup',
      margin_percentage = NULL,
      markup_adult = 10.00 + (random() * 20.00), -- Between 10€ and 30€
      markup_dog = 5.00 + (random() * 15.00), -- Between 5€ and 20€
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.70),
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.70)
    WHERE active = true 
      AND id NOT IN (
        SELECT id FROM public.experience 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR markup_adult IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % experiences with markup model', updated_count;
  END LOOP;

  -- Update classes with mixed pricing models
  FOR product_count IN 
    SELECT COUNT(*) FROM public.class WHERE active = true
  LOOP
    -- Set percentage model for first half
    UPDATE public.class
    SET 
      pricing_model = 'percentage',
      margin_percentage = 20.00 + (random() * 20.00), -- Between 20% and 40%
      markup_adult = NULL,
      markup_dog = NULL,
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.75),
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.75)
    WHERE active = true 
      AND id IN (
        SELECT id FROM public.class 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR margin_percentage IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % classes with percentage model', updated_count;
    
    -- Set markup model for second half
    UPDATE public.class
    SET 
      pricing_model = 'markup',
      margin_percentage = NULL,
      markup_adult = 8.00 + (random() * 17.00), -- Between 8€ and 25€
      markup_dog = 4.00 + (random() * 11.00), -- Between 4€ and 15€
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.75),
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.75)
    WHERE active = true 
      AND id NOT IN (
        SELECT id FROM public.class 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR markup_adult IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % classes with markup model', updated_count;
  END LOOP;

  -- Update trips with mixed pricing models
  FOR product_count IN 
    SELECT COUNT(*) FROM public.trip WHERE active = true
  LOOP
    -- Set percentage model for first half
    UPDATE public.trip
    SET 
      pricing_model = 'percentage',
      margin_percentage = 30.00 + (random() * 20.00), -- Between 30% and 50%
      markup_adult = NULL,
      markup_dog = NULL,
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.65),
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.65)
    WHERE active = true 
      AND id IN (
        SELECT id FROM public.trip 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR margin_percentage IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % trips with percentage model', updated_count;
    
    -- Set markup model for second half
    UPDATE public.trip
    SET 
      pricing_model = 'markup',
      margin_percentage = NULL,
      markup_adult = 50.00 + (random() * 100.00), -- Between 50€ and 150€
      markup_dog = 20.00 + (random() * 50.00), -- Between 20€ and 70€
      provider_cost_adult_base = COALESCE(provider_cost_adult_base, price_adult_base * 0.65),
      provider_cost_dog_base = COALESCE(provider_cost_dog_base, price_dog_base * 0.65)
    WHERE active = true 
      AND id NOT IN (
        SELECT id FROM public.trip 
        WHERE active = true 
        ORDER BY created_at 
        LIMIT (product_count / 2)
      )
      AND (pricing_model IS NULL OR markup_adult IS NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % trips with markup model', updated_count;
  END LOOP;

  -- Ensure all products have provider costs set (fallback for products without price_adult_base)
  UPDATE public.experience
  SET 
    provider_cost_adult_base = COALESCE(provider_cost_adult_base, 30.00),
    provider_cost_dog_base = COALESCE(provider_cost_dog_base, 15.00)
  WHERE active = true 
    AND (provider_cost_adult_base IS NULL OR provider_cost_dog_base IS NULL);

  UPDATE public.class
  SET 
    provider_cost_adult_base = COALESCE(provider_cost_adult_base, 25.00),
    provider_cost_dog_base = COALESCE(provider_cost_dog_base, 10.00)
  WHERE active = true 
    AND (provider_cost_adult_base IS NULL OR provider_cost_dog_base IS NULL);

  UPDATE public.trip
  SET 
    provider_cost_adult_base = COALESCE(provider_cost_adult_base, 150.00),
    provider_cost_dog_base = COALESCE(provider_cost_dog_base, 40.00)
  WHERE active = true 
    AND (provider_cost_adult_base IS NULL OR provider_cost_dog_base IS NULL);

  RAISE NOTICE 'Migration completed: Populated products with placeholder values';
END $$;

