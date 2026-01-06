-- ============================================
-- Add excluded_items, meeting_info, and show_meeting_info to products
-- ============================================
-- This migration adds:
-- 1. excluded_items: TEXT[] - Array of up to 10 strings describing what's NOT included
-- 2. meeting_info: JSONB - Object with text (string) and google_maps_link (string) for meeting point info
-- 3. show_meeting_info: BOOLEAN - Whether to show meeting info on product page
-- ============================================

DO $$
BEGIN
  -- Add excluded_items column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'excluded_items'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN excluded_items TEXT[] DEFAULT NULL;
    
    -- Add constraint to limit array size to 10
    ALTER TABLE public.experience
    ADD CONSTRAINT experience_excluded_items_max_length 
    CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10);
    
    RAISE NOTICE 'Added excluded_items column to experience table';
  END IF;

  -- Add meeting_info column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'meeting_info'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN meeting_info JSONB DEFAULT NULL;
    
    RAISE NOTICE 'Added meeting_info column to experience table';
  END IF;

  -- Add show_meeting_info column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'show_meeting_info'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN show_meeting_info BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added show_meeting_info column to experience table';
  END IF;

  -- Add excluded_items column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'excluded_items'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN excluded_items TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.class
    ADD CONSTRAINT class_excluded_items_max_length 
    CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10);
    
    RAISE NOTICE 'Added excluded_items column to class table';
  END IF;

  -- Add meeting_info column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'meeting_info'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN meeting_info JSONB DEFAULT NULL;
    
    RAISE NOTICE 'Added meeting_info column to class table';
  END IF;

  -- Add show_meeting_info column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'show_meeting_info'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN show_meeting_info BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added show_meeting_info column to class table';
  END IF;

  -- Add excluded_items column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'excluded_items'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN excluded_items TEXT[] DEFAULT NULL;
    
    ALTER TABLE public.trip
    ADD CONSTRAINT trip_excluded_items_max_length 
    CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10);
    
    RAISE NOTICE 'Added excluded_items column to trip table';
  END IF;

  -- Add meeting_info column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'meeting_info'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN meeting_info JSONB DEFAULT NULL;
    
    RAISE NOTICE 'Added meeting_info column to trip table';
  END IF;

  -- Add show_meeting_info column to trip table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'show_meeting_info'
  ) THEN
    ALTER TABLE public.trip
    ADD COLUMN show_meeting_info BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added show_meeting_info column to trip table';
  END IF;

  -- Add comments for documentation
  COMMENT ON COLUMN public.experience.excluded_items IS 'Array of up to 10 strings describing what is NOT included in this experience';
  COMMENT ON COLUMN public.experience.meeting_info IS 'JSONB object with text (string) and google_maps_link (string) for meeting point information';
  COMMENT ON COLUMN public.experience.show_meeting_info IS 'Whether to show meeting info on product page';
  
  COMMENT ON COLUMN public.class.excluded_items IS 'Array of up to 10 strings describing what is NOT included in this class';
  COMMENT ON COLUMN public.class.meeting_info IS 'JSONB object with text (string) and google_maps_link (string) for meeting point information';
  COMMENT ON COLUMN public.class.show_meeting_info IS 'Whether to show meeting info on product page';
  
  COMMENT ON COLUMN public.trip.excluded_items IS 'Array of up to 10 strings describing what is NOT included in this trip';
  COMMENT ON COLUMN public.trip.meeting_info IS 'JSONB object with text (string) and google_maps_link (string) for meeting point information';
  COMMENT ON COLUMN public.trip.show_meeting_info IS 'Whether to show meeting info on product page';

  RAISE NOTICE 'Migration completed: excluded_items, meeting_info, and show_meeting_info added successfully!';
END $$;

