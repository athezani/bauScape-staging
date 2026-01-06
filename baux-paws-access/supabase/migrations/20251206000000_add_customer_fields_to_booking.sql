-- ============================================
-- Add customer surname and phone fields to booking table
-- ============================================

-- Add customer_surname field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS customer_surname TEXT DEFAULT NULL;

-- Add customer_phone field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT NULL;

-- Create index on customer fields for faster queries
CREATE INDEX IF NOT EXISTS booking_customer_email_idx ON public.booking (customer_email);
CREATE INDEX IF NOT EXISTS booking_customer_phone_idx ON public.booking (customer_phone);

-- Add comments for documentation
COMMENT ON COLUMN public.booking.customer_surname IS 'Customer surname collected from Stripe Checkout';
COMMENT ON COLUMN public.booking.customer_phone IS 'Customer phone number collected from Stripe Checkout';

