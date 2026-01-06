-- ============================================
-- Add product attributes: attributes (JSON array)
-- ============================================
-- This migration adds:
-- 1. attributes: JSONB - Array of attribute keys (e.g., ['mountain', 'lake', 'sea'])
--    These attributes are used for search and filtering, and displayed as badges
-- ============================================

DO $$
BEGIN
  -- Add attributes column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'attributes'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN attributes JSONB DEFAULT NULL;
    
    -- Add constraint to ensure it's an array
    ALTER TABLE public.experience
    ADD CONSTRAINT experience_attributes_is_array 
    CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array');
    
    RAISE NOTICE 'Added attributes column to experience table';
  END IF;

  -- Add attributes column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'attributes'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN attributes JSONB DEFAULT NULL;
    
    ALTER TABLE public.class
    ADD CONSTRAINT class_attributes_is_array 
    CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array');
    
    RAISE NOTICE 'Added attributes column to class table';
  END IF;

  -- Add attributes column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'attributes'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN attributes JSONB DEFAULT NULL;
    
    ALTER TABLE public.trip
    ADD CONSTRAINT trip_attributes_is_array 
    CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array');
    
    RAISE NOTICE 'Added attributes column to trip table';
  END IF;

  -- Add comments for documentation
  COMMENT ON COLUMN public.experience.attributes IS 'JSON array of attribute keys (e.g., ["mountain", "lake"]) used for search, filtering, and display as badges';
  COMMENT ON COLUMN public.class.attributes IS 'JSON array of attribute keys (e.g., ["mountain", "lake"]) used for search, filtering, and display as badges';
  COMMENT ON COLUMN public.trip.attributes IS 'JSON array of attribute keys (e.g., ["mountain", "lake"]) used for search, filtering, and display as badges';

  RAISE NOTICE 'Migration completed: product attributes added successfully!';
END $$;

