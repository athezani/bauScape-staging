-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('class', 'experience', 'trip');

-- Table for Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER NOT NULL,
  price_per_person NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for Experiences
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER NOT NULL DEFAULT 10,
  duration_hours INTEGER NOT NULL,
  meeting_point TEXT,
  price_per_person NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER NOT NULL DEFAULT 10,
  duration_days INTEGER NOT NULL,
  itinerary TEXT,
  accommodation_included BOOLEAN DEFAULT false,
  meals_included TEXT,
  price_per_person NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Providers can manage own classes" ON public.classes FOR ALL USING (auth.uid() = provider_id);

-- RLS Policies for experiences  
CREATE POLICY "Providers can manage own experiences" ON public.experiences FOR ALL USING (auth.uid() = provider_id);

-- RLS Policies for trips
CREATE POLICY "Providers can manage own trips" ON public.trips FOR ALL USING (auth.uid() = provider_id);

-- Migrate data from bookings
INSERT INTO public.trips (provider_id, name, description, duration_days, price_per_person)
SELECT DISTINCT ON (provider_id, product_name)
  provider_id,
  product_name,
  product_description,
  COALESCE((end_date - booking_date) + 1, 1),
  CASE WHEN number_of_humans > 0 THEN total_amount / number_of_humans ELSE total_amount END
FROM public.bookings
WHERE product_type = 'trip' AND end_date IS NOT NULL;

INSERT INTO public.experiences (provider_id, name, description, duration_hours, price_per_person)
SELECT DISTINCT ON (provider_id, product_name)
  provider_id,
  product_name,
  product_description,
  8,
  CASE WHEN number_of_humans > 0 THEN total_amount / number_of_humans ELSE total_amount END
FROM public.bookings
WHERE product_type = 'experience';

-- Add columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_type public.event_type;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_id UUID;

-- Link bookings to events
UPDATE public.bookings b SET event_type = 'trip'::event_type, event_id = t.id
FROM public.trips t
WHERE b.product_type = 'trip' AND b.provider_id = t.provider_id AND b.product_name = t.name AND b.event_type IS NULL;

UPDATE public.bookings b SET event_type = 'experience'::event_type, event_id = e.id
FROM public.experiences e
WHERE b.product_type = 'experience' AND b.provider_id = e.provider_id AND b.product_name = e.name AND b.event_type IS NULL;

-- Add triggers
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON public.experiences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();