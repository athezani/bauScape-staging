-- ============================================
-- Complete all products data and assign to existing providers
-- ============================================
-- This migration:
-- 1. Finds all active products (experience, class, trip)
-- 2. Completes missing required fields with sensible defaults
-- 3. Assigns all products to existing providers
-- ============================================

DO $$
DECLARE
  default_provider_id UUID;
  product_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Step 1: Find or get default provider
  -- First try to find "lastminute.com" provider
  SELECT id INTO default_provider_id
  FROM public.profile
  WHERE LOWER(company_name) LIKE '%lastminute%' OR LOWER(company_name) LIKE '%last minute%'
  LIMIT 1;
  
  -- If not found, get any active provider
  IF default_provider_id IS NULL THEN
    SELECT id INTO default_provider_id
    FROM public.profile
    WHERE active = true
    LIMIT 1;
  END IF;
  
  -- If still not found, get any provider
  IF default_provider_id IS NULL THEN
    SELECT id INTO default_provider_id
    FROM public.profile
    LIMIT 1;
  END IF;
  
  IF default_provider_id IS NULL THEN
    RAISE NOTICE 'No provider found in database. Cannot assign products.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using provider ID: %', default_provider_id;
  
  -- Step 2: Complete EXPERIENCE products
  RAISE NOTICE 'Processing EXPERIENCE products...';
  
  -- Update experiences: assign provider_id if null, complete missing fields
  UPDATE public.experience
  SET 
    provider_id = COALESCE(provider_id, default_provider_id),
    name = COALESCE(name, 'Esperienza senza nome'),
    description = COALESCE(description, 'Un''esperienza indimenticabile con il tuo cane'),
    max_participants = COALESCE(max_participants, 10),
    duration_hours = COALESCE(duration_hours, 4),
    active = COALESCE(active, true),
    price_adult_base = COALESCE(price_adult_base, 50.00),
    price_dog_base = COALESCE(price_dog_base, 20.00),
    images = CASE 
      WHEN images IS NULL OR array_length(images, 1) IS NULL THEN ARRAY['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800']
      ELSE images
    END,
    cutoff_hours = COALESCE(cutoff_hours, 24),
    meeting_point = COALESCE(meeting_point, 'Da definire')
  WHERE provider_id IS NULL 
     OR name IS NULL 
     OR max_participants IS NULL 
     OR duration_hours IS NULL
     OR active IS NULL
     OR price_adult_base IS NULL
     OR price_dog_base IS NULL
     OR images IS NULL
     OR array_length(images, 1) IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % EXPERIENCE products', updated_count;
  
  -- Step 3: Complete CLASS products
  RAISE NOTICE 'Processing CLASS products...';
  
  UPDATE public.class
  SET 
    provider_id = COALESCE(provider_id, default_provider_id),
    name = COALESCE(name, 'Classe senza nome'),
    description = COALESCE(description, 'Una classe formativa per te e il tuo cane'),
    max_participants = COALESCE(max_participants, 10),
    duration_hours = COALESCE(duration_hours, 1),
    active = COALESCE(active, true),
    price_adult_base = COALESCE(price_adult_base, 40.00),
    price_dog_base = COALESCE(price_dog_base, 15.00),
    images = CASE 
      WHEN images IS NULL OR array_length(images, 1) IS NULL THEN ARRAY['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800']
      ELSE images
    END,
    cutoff_hours = COALESCE(cutoff_hours, 24)
  WHERE provider_id IS NULL 
     OR name IS NULL 
     OR max_participants IS NULL 
     OR duration_hours IS NULL
     OR active IS NULL
     OR price_adult_base IS NULL
     OR price_dog_base IS NULL
     OR images IS NULL
     OR array_length(images, 1) IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % CLASS products', updated_count;
  
  -- Step 4: Complete TRIP products
  RAISE NOTICE 'Processing TRIP products...';
  
  UPDATE public.trip
  SET 
    provider_id = COALESCE(provider_id, default_provider_id),
    name = COALESCE(name, 'Viaggio senza nome'),
    description = COALESCE(description, 'Un viaggio indimenticabile con il tuo cane'),
    max_participants = COALESCE(max_participants, 10),
    duration_days = COALESCE(duration_days, 3),
    active = COALESCE(active, true),
    price_adult_base = COALESCE(price_adult_base, 200.00),
    price_dog_base = COALESCE(price_dog_base, 50.00),
    images = CASE 
      WHEN images IS NULL OR array_length(images, 1) IS NULL THEN ARRAY['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800']
      ELSE images
    END,
    cutoff_hours = COALESCE(cutoff_hours, 48),
    start_date = COALESCE(start_date, CURRENT_DATE + INTERVAL '30 days'),
    end_date = COALESCE(end_date, COALESCE(start_date, CURRENT_DATE + INTERVAL '30 days') + (COALESCE(duration_days, 3) || ' days')::INTERVAL)
  WHERE provider_id IS NULL 
     OR name IS NULL 
     OR max_participants IS NULL 
     OR duration_days IS NULL
     OR active IS NULL
     OR price_adult_base IS NULL
     OR price_dog_base IS NULL
     OR images IS NULL
     OR array_length(images, 1) IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % TRIP products', updated_count;
  
  -- Step 5: Ensure all active products have provider_id (final check)
  RAISE NOTICE 'Final check: ensuring all active products have provider_id...';
  
  UPDATE public.experience
  SET provider_id = default_provider_id
  WHERE active = true AND provider_id IS NULL;
  
  UPDATE public.class
  SET provider_id = default_provider_id
  WHERE active = true AND provider_id IS NULL;
  
  UPDATE public.trip
  SET provider_id = default_provider_id
  WHERE active = true AND provider_id IS NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.experience.provider_id IS 'Provider who owns this experience. Required for booking creation.';
COMMENT ON COLUMN public.class.provider_id IS 'Provider who owns this class. Required for booking creation.';
COMMENT ON COLUMN public.trip.provider_id IS 'Provider who owns this trip. Required for booking creation.';

