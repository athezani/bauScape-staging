-- Add images column to all product tables (stores array of image URLs)

ALTER TABLE public.class
ADD COLUMN images text[] DEFAULT '{}';

ALTER TABLE public.experience
ADD COLUMN images text[] DEFAULT '{}';

ALTER TABLE public.trip
ADD COLUMN images text[] DEFAULT '{}';