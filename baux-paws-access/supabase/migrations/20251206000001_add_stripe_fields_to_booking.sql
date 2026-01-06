-- ============================================
-- Add Stripe fields to booking table
-- ============================================

-- Add stripe_checkout_session_id field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT DEFAULT NULL;

-- Add stripe_payment_intent_id field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

-- Add total_amount_paid field if it doesn't exist (might be named differently)
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS total_amount_paid NUMERIC(10,2) DEFAULT NULL;

-- Add currency field if it doesn't exist
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Add number_of_adults field if it doesn't exist (might be number_of_humans)
DO $$
BEGIN
  -- Check if number_of_adults exists, if not check for number_of_humans
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'number_of_adults'
  ) THEN
    -- If number_of_humans exists, we can use it, otherwise add number_of_adults
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'number_of_humans'
    ) THEN
      -- Add number_of_adults as alias or add it
      ALTER TABLE public.booking 
      ADD COLUMN IF NOT EXISTS number_of_adults INTEGER DEFAULT 1;
    ELSE
      ALTER TABLE public.booking 
      ADD COLUMN IF NOT EXISTS number_of_adults INTEGER NOT NULL DEFAULT 1;
    END IF;
  END IF;
END $$;

-- Create indexes for Stripe fields
CREATE INDEX IF NOT EXISTS booking_stripe_session_idx ON public.booking (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS booking_stripe_payment_intent_idx ON public.booking (stripe_payment_intent_id);

-- Add comments for documentation
COMMENT ON COLUMN public.booking.stripe_checkout_session_id IS 'Stripe Checkout Session ID from payment';
COMMENT ON COLUMN public.booking.stripe_payment_intent_id IS 'Stripe Payment Intent ID from payment';
COMMENT ON COLUMN public.booking.total_amount_paid IS 'Total amount paid in the booking';
COMMENT ON COLUMN public.booking.currency IS 'Currency code (e.g., EUR)';



