-- Create pricing_type enum
CREATE TYPE public.pricing_type AS ENUM ('linear', 'predefined');

-- Modify trips table structure
ALTER TABLE public.trips
  DROP COLUMN IF EXISTS itinerary,
  DROP COLUMN IF EXISTS accommodation_included,
  DROP COLUMN IF EXISTS meals_included,
  ADD COLUMN pricing_type public.pricing_type DEFAULT 'linear'::pricing_type,
  ADD COLUMN price_adult_base NUMERIC(10,2),
  ADD COLUMN price_dog_base NUMERIC(10,2),
  ADD COLUMN predefined_prices JSONB,
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN location TEXT,
  ADD COLUMN booking_qty INTEGER DEFAULT 0;