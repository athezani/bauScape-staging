-- Create enum for product types
CREATE TYPE public.product_type AS ENUM ('experience', 'trip');

-- Add product_type column to bookings
ALTER TABLE public.bookings 
ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'experience';

-- Rename experience columns to be more generic
ALTER TABLE public.bookings 
RENAME COLUMN experience_name TO product_name;

ALTER TABLE public.bookings 
RENAME COLUMN experience_description TO product_description;

-- Update existing bookings to have product_type = 'experience'
-- (already done by default value, but explicit for clarity)
UPDATE public.bookings SET product_type = 'experience' WHERE product_type IS NULL;