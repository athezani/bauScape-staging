-- ============================================
-- Add 'class' to product_type enum
-- ============================================
-- The product_type enum was created with only 'experience' and 'trip'
-- This migration adds 'class' to support class bookings
-- ============================================

-- Add 'class' to the product_type enum
DO $$
BEGIN
  -- Check if 'class' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'class' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'product_type'
    )
  ) THEN
    -- Add 'class' to the enum
    ALTER TYPE public.product_type ADD VALUE 'class';
    RAISE NOTICE 'Added ''class'' to product_type enum';
  ELSE
    RAISE NOTICE '''class'' already exists in product_type enum';
  END IF;
END $$;

-- Verify the enum now has all three values
DO $$
DECLARE
  enum_values TEXT[];
BEGIN
  SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_type');
  
  RAISE NOTICE 'product_type enum values: %', array_to_string(enum_values, ', ');
  
  IF NOT ('class' = ANY(enum_values)) THEN
    RAISE EXCEPTION 'Failed to add ''class'' to product_type enum. Current values: %', array_to_string(enum_values, ', ');
  END IF;
END $$;



