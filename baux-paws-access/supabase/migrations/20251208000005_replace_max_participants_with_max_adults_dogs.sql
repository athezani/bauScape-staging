-- ============================================
-- Replace max_participants with max_adults and max_dogs
-- ============================================
-- This migration:
-- 1. Adds max_adults and max_dogs columns to experience, class, and trip tables
-- 2. Migrates existing max_participants data to max_adults
-- 3. Sets max_dogs to a high default value (999) for existing records
-- 4. Removes max_participants column
-- ============================================

-- Step 1: Add max_adults and max_dogs to experience table
DO $$
BEGIN
  -- Add max_adults if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'max_adults'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN max_adults INTEGER NOT NULL DEFAULT 10 CHECK (max_adults > 0);
    RAISE NOTICE 'Added max_adults to experience table';
  END IF;

  -- Add max_dogs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'max_dogs'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN max_dogs INTEGER NOT NULL DEFAULT 999 CHECK (max_dogs >= 0);
    RAISE NOTICE 'Added max_dogs to experience table';
  END IF;
END $$;

-- Step 2: Add max_adults and max_dogs to class table
DO $$
BEGIN
  -- Add max_adults if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'max_adults'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN max_adults INTEGER NOT NULL DEFAULT 10 CHECK (max_adults > 0);
    RAISE NOTICE 'Added max_adults to class table';
  END IF;

  -- Add max_dogs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'max_dogs'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN max_dogs INTEGER NOT NULL DEFAULT 999 CHECK (max_dogs >= 0);
    RAISE NOTICE 'Added max_dogs to class table';
  END IF;
END $$;

-- Step 3: Add max_adults and max_dogs to trip table
DO $$
BEGIN
  -- Add max_adults if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'max_adults'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN max_adults INTEGER NOT NULL DEFAULT 10 CHECK (max_adults > 0);
    RAISE NOTICE 'Added max_adults to trip table';
  END IF;

  -- Add max_dogs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'max_dogs'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN max_dogs INTEGER NOT NULL DEFAULT 999 CHECK (max_dogs >= 0);
    RAISE NOTICE 'Added max_dogs to trip table';
  END IF;
END $$;

-- Step 4: Migrate existing max_participants data to max_adults
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Migrate experience
  UPDATE public.experience
  SET max_adults = COALESCE(max_participants, 10)
  WHERE max_participants IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % experience records from max_participants to max_adults', updated_count;

  -- Migrate class
  UPDATE public.class
  SET max_adults = COALESCE(max_participants, 10)
  WHERE max_participants IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % class records from max_participants to max_adults', updated_count;

  -- Migrate trip
  UPDATE public.trip
  SET max_adults = COALESCE(max_participants, 10)
  WHERE max_participants IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % trip records from max_participants to max_adults', updated_count;
END $$;

-- Step 5: Remove max_participants column from all tables
DO $$
BEGIN
  -- Remove from experience
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE public.experience DROP COLUMN max_participants;
    RAISE NOTICE 'Dropped max_participants from experience table';
  END IF;

  -- Remove from class
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE public.class DROP COLUMN max_participants;
    RAISE NOTICE 'Dropped max_participants from class table';
  END IF;

  -- Remove from trip
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE public.trip DROP COLUMN max_participants;
    RAISE NOTICE 'Dropped max_participants from trip table';
  END IF;
END $$;

-- Step 6: Add comments
COMMENT ON COLUMN public.experience.max_adults IS 'Maximum number of adults allowed for this experience';
COMMENT ON COLUMN public.experience.max_dogs IS 'Maximum number of dogs allowed for this experience';
COMMENT ON COLUMN public.class.max_adults IS 'Maximum number of adults allowed for this class';
COMMENT ON COLUMN public.class.max_dogs IS 'Maximum number of dogs allowed for this class';
COMMENT ON COLUMN public.trip.max_adults IS 'Maximum number of adults allowed for this trip';
COMMENT ON COLUMN public.trip.max_dogs IS 'Maximum number of dogs allowed for this trip';

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: max_participants replaced with max_adults and max_dogs';
END $$;

