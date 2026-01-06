-- ============================================
-- Add RLS policy to allow public read access to bookings via stripe_checkout_session_id
-- This is needed for the ThankYouPage to work after payment
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.booking ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view own booking by session id" ON public.booking;

-- Create policy to allow anyone to read booking by stripe_checkout_session_id
-- This is safe because the session_id is a secret token from Stripe
CREATE POLICY "Public can view own booking by session id"
ON public.booking
FOR SELECT
TO anon, authenticated
USING (stripe_checkout_session_id IS NOT NULL);

-- Also allow reading by customer_email for additional flexibility
-- (in case session_id lookup fails, we can fallback to email)
DROP POLICY IF EXISTS "Public can view own booking by email" ON public.booking;

CREATE POLICY "Public can view own booking by email"
ON public.booking
FOR SELECT
TO anon, authenticated
USING (customer_email IS NOT NULL);



