-- Update experiences table structure
ALTER TABLE public.experiences
  DROP COLUMN IF EXISTS price_per_person,
  ADD COLUMN pricing_type public.pricing_type DEFAULT 'linear'::pricing_type,
  ADD COLUMN price_adult_base NUMERIC(10,2),
  ADD COLUMN price_dog_base NUMERIC(10,2),
  ADD COLUMN predefined_prices JSONB;

-- Update classes table structure
ALTER TABLE public.classes
  DROP COLUMN IF EXISTS price_per_person,
  ADD COLUMN pricing_type public.pricing_type DEFAULT 'linear'::pricing_type,
  ADD COLUMN price_adult_base NUMERIC(10,2),
  ADD COLUMN price_dog_base NUMERIC(10,2),
  ADD COLUMN predefined_prices JSONB;