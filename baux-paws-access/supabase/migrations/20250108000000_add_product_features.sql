-- ============================================
-- Add product features: highlights, included_items, cancellation_policy
-- ============================================
-- This migration adds:
-- 1. highlights: TEXT[] - Array of up to 10 strings describing what makes the product special
-- 2. included_items: TEXT[] - Array of up to 10 strings describing what's included
-- 3. cancellation_policy: TEXT - Cancellation policy text (required)
-- ============================================

DO $$
BEGIN
  -- Add highlights column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'highlights'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN highlights TEXT[] DEFAULT NULL;
    
    -- Add constraint to limit array size to 10
    ALTER TABLE public.experience
    ADD CONSTRAINT experience_highlights_max_length 
    CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10);
    
    RAISE NOTICE 'Added highlights column to experience table';
  END IF;

  -- Add included_items column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'included_items'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN included_items TEXT[] DEFAULT NULL;
    
    -- Add constraint to limit array size to 10
    ALTER TABLE public.experience
    ADD CONSTRAINT experience_included_items_max_length 
    CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10);
    
    RAISE NOTICE 'Added included_items column to experience table';
  END IF;

  -- Add cancellation_policy column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'cancellation_policy'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN cancellation_policy TEXT NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.';
    
    RAISE NOTICE 'Added cancellation_policy column to experience table';
  END IF;

  -- Add highlights column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'highlights'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN highlights TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.class
    ADD CONSTRAINT class_highlights_max_length 
    CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10);
    
    RAISE NOTICE 'Added highlights column to class table';
  END IF;

  -- Add included_items column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'included_items'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN included_items TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.class
    ADD CONSTRAINT class_included_items_max_length 
    CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10);
    
    RAISE NOTICE 'Added included_items column to class table';
  END IF;

  -- Add cancellation_policy column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'cancellation_policy'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN cancellation_policy TEXT NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.';
    
    RAISE NOTICE 'Added cancellation_policy column to class table';
  END IF;

  -- Add highlights column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'highlights'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN highlights TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.trip
    ADD CONSTRAINT trip_highlights_max_length 
    CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10);
    
    RAISE NOTICE 'Added highlights column to trip table';
  END IF;

  -- Add included_items column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'included_items'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN included_items TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.trip
    ADD CONSTRAINT trip_included_items_max_length 
    CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10);
    
    RAISE NOTICE 'Added included_items column to trip table';
  END IF;

  -- Add cancellation_policy column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'cancellation_policy'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN cancellation_policy TEXT NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.';
    
    RAISE NOTICE 'Added cancellation_policy column to trip table';
  END IF;

  -- Add comments for documentation
  COMMENT ON COLUMN public.experience.highlights IS 'Array of up to 10 strings describing what makes this experience special';
  COMMENT ON COLUMN public.experience.included_items IS 'Array of up to 10 strings describing what is included in this experience';
  COMMENT ON COLUMN public.experience.cancellation_policy IS 'Cancellation policy text for this experience';
  
  COMMENT ON COLUMN public.class.highlights IS 'Array of up to 10 strings describing what makes this class special';
  COMMENT ON COLUMN public.class.included_items IS 'Array of up to 10 strings describing what is included in this class';
  COMMENT ON COLUMN public.class.cancellation_policy IS 'Cancellation policy text for this class';
  
  COMMENT ON COLUMN public.trip.highlights IS 'Array of up to 10 strings describing what makes this trip special';
  COMMENT ON COLUMN public.trip.included_items IS 'Array of up to 10 strings describing what is included in this trip';
  COMMENT ON COLUMN public.trip.cancellation_policy IS 'Cancellation policy text for this trip';

  RAISE NOTICE 'Migration completed: product features added successfully!';
END $$;



