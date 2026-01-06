-- ============================================
-- Add Pricing Model and Provider Cost Fields to Products
-- ============================================
-- This migration adds:
-- 1. pricing_model ENUM ('percentage', 'markup')
-- 2. margin_percentage (for percentage model)
-- 3. markup_adult and markup_dog (for markup model)
-- 4. provider_cost_adult_base and provider_cost_dog_base (cost per unit)
-- ============================================

-- Step 1: Create pricing_model enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_model') THEN
    CREATE TYPE public.pricing_model AS ENUM ('percentage', 'markup');
    RAISE NOTICE 'Created pricing_model enum';
  ELSE
    RAISE NOTICE 'pricing_model enum already exists';
  END IF;
END $$;

-- Step 2: Add pricing fields to experience table
DO $$
BEGIN
  -- Add pricing_model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'pricing_model'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN pricing_model public.pricing_model DEFAULT 'percentage';
    RAISE NOTICE 'Added pricing_model to experience table';
  END IF;

  -- Add margin_percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'margin_percentage'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN margin_percentage NUMERIC(5,2) DEFAULT NULL 
    CHECK (margin_percentage IS NULL OR (margin_percentage >= 0 AND margin_percentage <= 1000));
    RAISE NOTICE 'Added margin_percentage to experience table';
  END IF;

  -- Add markup_adult
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'markup_adult'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN markup_adult NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_adult IS NULL OR markup_adult >= 0);
    RAISE NOTICE 'Added markup_adult to experience table';
  END IF;

  -- Add markup_dog
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'markup_dog'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN markup_dog NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_dog IS NULL OR markup_dog >= 0);
    RAISE NOTICE 'Added markup_dog to experience table';
  END IF;

  -- Add provider_cost_adult_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'provider_cost_adult_base'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN provider_cost_adult_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0);
    RAISE NOTICE 'Added provider_cost_adult_base to experience table';
  END IF;

  -- Add provider_cost_dog_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'provider_cost_dog_base'
  ) THEN
    ALTER TABLE public.experience 
    ADD COLUMN provider_cost_dog_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0);
    RAISE NOTICE 'Added provider_cost_dog_base to experience table';
  END IF;
END $$;

-- Step 3: Add pricing fields to class table
DO $$
BEGIN
  -- Add pricing_model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'pricing_model'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN pricing_model public.pricing_model DEFAULT 'percentage';
    RAISE NOTICE 'Added pricing_model to class table';
  END IF;

  -- Add margin_percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'margin_percentage'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN margin_percentage NUMERIC(5,2) DEFAULT NULL 
    CHECK (margin_percentage IS NULL OR (margin_percentage >= 0 AND margin_percentage <= 1000));
    RAISE NOTICE 'Added margin_percentage to class table';
  END IF;

  -- Add markup_adult
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'markup_adult'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN markup_adult NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_adult IS NULL OR markup_adult >= 0);
    RAISE NOTICE 'Added markup_adult to class table';
  END IF;

  -- Add markup_dog
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'markup_dog'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN markup_dog NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_dog IS NULL OR markup_dog >= 0);
    RAISE NOTICE 'Added markup_dog to class table';
  END IF;

  -- Add provider_cost_adult_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'provider_cost_adult_base'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN provider_cost_adult_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0);
    RAISE NOTICE 'Added provider_cost_adult_base to class table';
  END IF;

  -- Add provider_cost_dog_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'provider_cost_dog_base'
  ) THEN
    ALTER TABLE public.class 
    ADD COLUMN provider_cost_dog_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0);
    RAISE NOTICE 'Added provider_cost_dog_base to class table';
  END IF;
END $$;

-- Step 4: Add pricing fields to trip table
DO $$
BEGIN
  -- Add pricing_model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'pricing_model'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN pricing_model public.pricing_model DEFAULT 'percentage';
    RAISE NOTICE 'Added pricing_model to trip table';
  END IF;

  -- Add margin_percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'margin_percentage'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN margin_percentage NUMERIC(5,2) DEFAULT NULL 
    CHECK (margin_percentage IS NULL OR (margin_percentage >= 0 AND margin_percentage <= 1000));
    RAISE NOTICE 'Added margin_percentage to trip table';
  END IF;

  -- Add markup_adult
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'markup_adult'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN markup_adult NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_adult IS NULL OR markup_adult >= 0);
    RAISE NOTICE 'Added markup_adult to trip table';
  END IF;

  -- Add markup_dog
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'markup_dog'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN markup_dog NUMERIC(10,2) DEFAULT NULL 
    CHECK (markup_dog IS NULL OR markup_dog >= 0);
    RAISE NOTICE 'Added markup_dog to trip table';
  END IF;

  -- Add provider_cost_adult_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'provider_cost_adult_base'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN provider_cost_adult_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0);
    RAISE NOTICE 'Added provider_cost_adult_base to trip table';
  END IF;

  -- Add provider_cost_dog_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip' 
    AND column_name = 'provider_cost_dog_base'
  ) THEN
    ALTER TABLE public.trip 
    ADD COLUMN provider_cost_dog_base NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0);
    RAISE NOTICE 'Added provider_cost_dog_base to trip table';
  END IF;
END $$;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN public.experience.pricing_model IS 'Pricing model: percentage (margin % on provider cost) or markup (fixed fee per unit)';
COMMENT ON COLUMN public.experience.margin_percentage IS 'Margin percentage on provider cost (used when pricing_model is percentage)';
COMMENT ON COLUMN public.experience.markup_adult IS 'Fixed markup per adult unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.experience.markup_dog IS 'Fixed markup per dog unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.experience.provider_cost_adult_base IS 'Base provider cost per adult unit';
COMMENT ON COLUMN public.experience.provider_cost_dog_base IS 'Base provider cost per dog unit';

COMMENT ON COLUMN public.class.pricing_model IS 'Pricing model: percentage (margin % on provider cost) or markup (fixed fee per unit)';
COMMENT ON COLUMN public.class.margin_percentage IS 'Margin percentage on provider cost (used when pricing_model is percentage)';
COMMENT ON COLUMN public.class.markup_adult IS 'Fixed markup per adult unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.class.markup_dog IS 'Fixed markup per dog unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.class.provider_cost_adult_base IS 'Base provider cost per adult unit';
COMMENT ON COLUMN public.class.provider_cost_dog_base IS 'Base provider cost per dog unit';

COMMENT ON COLUMN public.trip.pricing_model IS 'Pricing model: percentage (margin % on provider cost) or markup (fixed fee per unit)';
COMMENT ON COLUMN public.trip.margin_percentage IS 'Margin percentage on provider cost (used when pricing_model is percentage)';
COMMENT ON COLUMN public.trip.markup_adult IS 'Fixed markup per adult unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.trip.markup_dog IS 'Fixed markup per dog unit (used when pricing_model is markup)';
COMMENT ON COLUMN public.trip.provider_cost_adult_base IS 'Base provider cost per adult unit';
COMMENT ON COLUMN public.trip.provider_cost_dog_base IS 'Base provider cost per dog unit';

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added pricing model and provider cost fields to products';
END $$;

