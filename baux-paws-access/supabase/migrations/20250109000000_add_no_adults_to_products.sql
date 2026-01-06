-- ============================================
-- Add no_adults column to class and experience tables
-- ============================================
-- This migration adds:
-- - no_adults: BOOLEAN - If true, the product doesn't require adult selection
--   and only shows dog selection. Adults will be 0 in bookings.
-- ============================================

DO $$
BEGIN
  -- Add no_adults column to experience table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'no_adults'
  ) THEN
    ALTER TABLE public.experience
    ADD COLUMN no_adults BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added no_adults column to experience table';
  END IF;

  -- Add no_adults column to class table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class' 
    AND column_name = 'no_adults'
  ) THEN
    ALTER TABLE public.class
    ADD COLUMN no_adults BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added no_adults column to class table';
  END IF;

  -- Add comments for documentation
  COMMENT ON COLUMN public.experience.no_adults IS 'If true, product does not require adult selection. Only dogs are selectable and adults will be 0 in bookings.';
  COMMENT ON COLUMN public.class.no_adults IS 'If true, product does not require adult selection. Only dogs are selectable and adults will be 0 in bookings.';

  RAISE NOTICE 'Migration completed: no_adults column added successfully!';
END $$;



