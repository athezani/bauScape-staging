-- ============================================
-- Add missing fields to booking table for complete traceability
-- ============================================

-- Add booking_time field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS booking_time TIME DEFAULT NULL;

-- Add product_name field for traceability (denormalized for easier queries)
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT NULL;

-- Add product_description field for traceability
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS product_description TEXT DEFAULT NULL;

-- Add provider_id field if it doesn't exist (for linking to provider)
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profile(id) ON DELETE SET NULL;

-- Create index on provider_id for faster queries
CREATE INDEX IF NOT EXISTS booking_provider_id_idx ON public.booking (provider_id);

-- Create index on booking_date and booking_time for date/time queries
CREATE INDEX IF NOT EXISTS booking_datetime_idx ON public.booking (booking_date, booking_time);

-- Add comment for documentation
COMMENT ON COLUMN public.booking.booking_time IS 'Time slot selected for the booking (for experiences/classes)';
COMMENT ON COLUMN public.booking.product_name IS 'Product name at time of booking (denormalized for traceability)';
COMMENT ON COLUMN public.booking.product_description IS 'Product description at time of booking (denormalized for traceability)';
COMMENT ON COLUMN public.booking.provider_id IS 'Provider who owns this product';



