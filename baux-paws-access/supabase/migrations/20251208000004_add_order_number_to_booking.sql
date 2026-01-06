-- ============================================
-- Add order_number column to booking table
-- ============================================
-- This migration adds an order_number column to store the order number
-- (last 8 characters of stripe_checkout_session_id in uppercase)
-- ============================================

-- Add order_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN order_number TEXT DEFAULT NULL;
    
    RAISE NOTICE 'Added order_number column to booking table';
  ELSE
    RAISE NOTICE 'order_number column already exists';
  END IF;
END $$;

-- Create index on order_number for faster lookups
CREATE INDEX IF NOT EXISTS booking_order_number_idx ON public.booking (order_number);

-- Update existing bookings to populate order_number from stripe_checkout_session_id
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.booking
  SET order_number = UPPER(RIGHT(stripe_checkout_session_id, 8))
  WHERE stripe_checkout_session_id IS NOT NULL 
    AND order_number IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % existing bookings with order_number', updated_count;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.booking.order_number IS 'Order number (last 8 characters of stripe_checkout_session_id in uppercase)';

