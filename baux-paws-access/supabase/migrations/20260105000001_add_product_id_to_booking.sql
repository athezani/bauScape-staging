-- ============================================
-- Add product_id column to booking table
-- ============================================
-- This is CRITICAL for Odoo integration to properly
-- link bookings to their original products

-- Step 1: Add product_id column
ALTER TABLE public.booking 
ADD COLUMN IF NOT EXISTS product_id UUID;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS booking_product_id_idx 
ON public.booking (product_id);

-- Step 3: Add comment
COMMENT ON COLUMN public.booking.product_id IS 'UUID of the product (experience, class, or trip) - determines which table to join based on product_type';

-- Step 4: Backfill existing bookings from metadata if available
-- This is best-effort for historical data
DO $$
BEGIN
  UPDATE public.booking
  SET product_id = CAST(metadata->>'product_id' AS UUID)
  WHERE product_id IS NULL 
    AND metadata IS NOT NULL 
    AND metadata->>'product_id' IS NOT NULL 
    AND metadata->>'product_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
  RAISE NOTICE 'Backfilled product_id for % bookings from metadata', 
    (SELECT COUNT(*) FROM public.booking WHERE product_id IS NOT NULL);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not backfill all product_ids: %', SQLERRM;
END $$;

