-- ============================================
-- Complete Schema Migration from Production
-- Generated: 2026-01-05
-- Source: zyonwzilijgnnnmhxvbo (production)
-- Target: ilbbviadwedumvvwqqon (staging)
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE public.product_type AS ENUM ('experience', 'class', 'trip');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_model') THEN
        CREATE TYPE public.pricing_model AS ENUM ('percentage', 'markup', 'fixed');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'provider');
    END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES (in order of dependencies)
-- ============================================

-- Table: profile (referenced by booking)
CREATE TABLE IF NOT EXISTS public.profile (
  id uuid NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT profile_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Table: experience
CREATE TABLE IF NOT EXISTS public.experience (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid,
  name text NOT NULL,
  description text,
  duration_hours integer CHECK (duration_hours IS NULL OR duration_hours > 0),
  meeting_point text,
  pricing_type text DEFAULT 'fixed'::text,
  price_adult_base numeric NOT NULL DEFAULT 0 CHECK (price_adult_base >= 0::numeric),
  price_dog_base numeric DEFAULT 0 CHECK (price_dog_base >= 0::numeric),
  predefined_prices jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  images text[] DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  cutoff_hours integer CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0),
  full_day_start_time time without time zone,
  full_day_end_time time without time zone,
  max_adults integer NOT NULL DEFAULT 10 CHECK (max_adults > 0),
  max_dogs integer NOT NULL DEFAULT 999 CHECK (max_dogs >= 0),
  highlights text[] CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10),
  included_items text[] CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10),
  cancellation_policy text NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.'::text,
  no_adults boolean NOT NULL DEFAULT false,
  pricing_model public.pricing_model DEFAULT 'percentage'::pricing_model,
  margin_percentage numeric DEFAULT NULL::numeric CHECK (margin_percentage IS NULL OR margin_percentage >= 0::numeric AND margin_percentage <= 1000::numeric),
  markup_adult numeric DEFAULT NULL::numeric CHECK (markup_adult IS NULL OR markup_adult >= 0::numeric),
  markup_dog numeric DEFAULT NULL::numeric CHECK (markup_dog IS NULL OR markup_dog >= 0::numeric),
  provider_cost_adult_base numeric DEFAULT NULL::numeric CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0::numeric),
  provider_cost_dog_base numeric DEFAULT NULL::numeric CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0::numeric),
  attributes jsonb CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array'::text),
  excluded_items text[] CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10),
  meeting_info jsonb,
  show_meeting_info boolean NOT NULL DEFAULT false,
  CONSTRAINT experience_pkey PRIMARY KEY (id)
);

-- Table: class
CREATE TABLE IF NOT EXISTS public.class (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid,
  name text NOT NULL,
  description text,
  duration_hours integer CHECK (duration_hours IS NULL OR duration_hours > 0),
  meeting_point text,
  pricing_type text DEFAULT 'fixed'::text,
  price_adult_base numeric NOT NULL DEFAULT 0 CHECK (price_adult_base >= 0::numeric),
  price_dog_base numeric DEFAULT 0 CHECK (price_dog_base >= 0::numeric),
  predefined_prices jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  images text[] DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  cutoff_hours integer CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0),
  full_day_start_time time without time zone,
  full_day_end_time time without time zone,
  max_adults integer NOT NULL DEFAULT 10 CHECK (max_adults > 0),
  max_dogs integer NOT NULL DEFAULT 999 CHECK (max_dogs >= 0),
  highlights text[] CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10),
  included_items text[] CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10),
  cancellation_policy text NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.'::text,
  no_adults boolean NOT NULL DEFAULT false,
  pricing_model public.pricing_model DEFAULT 'percentage'::pricing_model,
  margin_percentage numeric DEFAULT NULL::numeric CHECK (margin_percentage IS NULL OR margin_percentage >= 0::numeric AND margin_percentage <= 1000::numeric),
  markup_adult numeric DEFAULT NULL::numeric CHECK (markup_adult IS NULL OR markup_adult >= 0::numeric),
  markup_dog numeric DEFAULT NULL::numeric CHECK (markup_dog IS NULL OR markup_dog >= 0::numeric),
  provider_cost_adult_base numeric DEFAULT NULL::numeric CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0::numeric),
  provider_cost_dog_base numeric DEFAULT NULL::numeric CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0::numeric),
  attributes jsonb CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array'::text),
  excluded_items text[] CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10),
  meeting_info jsonb,
  show_meeting_info boolean NOT NULL DEFAULT false,
  CONSTRAINT class_pkey PRIMARY KEY (id)
);

-- Table: trip
CREATE TABLE IF NOT EXISTS public.trip (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid,
  name text NOT NULL,
  description text,
  pricing_type text DEFAULT 'fixed'::text,
  price_adult_base numeric NOT NULL DEFAULT 0 CHECK (price_adult_base >= 0::numeric),
  price_dog_base numeric DEFAULT 0 CHECK (price_dog_base >= 0::numeric),
  predefined_prices jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  start_date date,
  end_date date,
  location text,
  booking_qty integer DEFAULT 0 CHECK (booking_qty >= 0),
  images text[] DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  cutoff_hours integer CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0),
  max_adults integer NOT NULL DEFAULT 10 CHECK (max_adults > 0),
  max_dogs integer NOT NULL DEFAULT 999 CHECK (max_dogs >= 0),
  highlights text[] CHECK (highlights IS NULL OR array_length(highlights, 1) <= 10),
  included_items text[] CHECK (included_items IS NULL OR array_length(included_items, 1) <= 10),
  cancellation_policy text NOT NULL DEFAULT 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.'::text,
  pricing_model public.pricing_model DEFAULT 'percentage'::pricing_model,
  margin_percentage numeric DEFAULT NULL::numeric CHECK (margin_percentage IS NULL OR margin_percentage >= 0::numeric AND margin_percentage <= 1000::numeric),
  markup_adult numeric DEFAULT NULL::numeric CHECK (markup_adult IS NULL OR markup_adult >= 0::numeric),
  markup_dog numeric DEFAULT NULL::numeric CHECK (markup_dog IS NULL OR markup_dog >= 0::numeric),
  provider_cost_adult_base numeric DEFAULT NULL::numeric CHECK (provider_cost_adult_base IS NULL OR provider_cost_adult_base >= 0::numeric),
  provider_cost_dog_base numeric DEFAULT NULL::numeric CHECK (provider_cost_dog_base IS NULL OR provider_cost_dog_base >= 0::numeric),
  attributes jsonb CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'array'::text),
  excluded_items text[] CHECK (excluded_items IS NULL OR array_length(excluded_items, 1) <= 10),
  meeting_info jsonb,
  show_meeting_info boolean NOT NULL DEFAULT false,
  CONSTRAINT trip_pkey PRIMARY KEY (id)
);

-- Table: availability_slot
CREATE TABLE IF NOT EXISTS public.availability_slot (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type = ANY (ARRAY['experience'::text, 'class'::text, 'trip'::text])),
  date date NOT NULL,
  time_slot time without time zone,
  end_time time without time zone,
  max_adults integer NOT NULL DEFAULT 999 CHECK (max_adults > 0),
  max_dogs integer NOT NULL DEFAULT 999 CHECK (max_dogs >= 0),
  booked_adults integer NOT NULL DEFAULT 0 CHECK (booked_adults >= 0),
  booked_dogs integer NOT NULL DEFAULT 0 CHECK (booked_dogs >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT availability_slot_pkey PRIMARY KEY (id)
);

-- Table: booking
CREATE TABLE IF NOT EXISTS public.booking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  product_name text NOT NULL,
  product_description text,
  booking_date date NOT NULL,
  booking_time timestamp with time zone DEFAULT now(),
  number_of_dogs integer DEFAULT 1,
  number_of_humans integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])),
  special_requests text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  product_type public.product_type NOT NULL DEFAULT 'experience'::product_type,
  availability_slot_id uuid,
  trip_start_date date,
  trip_end_date date,
  customer_surname text,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  total_amount_paid numeric DEFAULT NULL::numeric,
  currency text DEFAULT 'EUR'::text,
  number_of_adults integer DEFAULT 1,
  order_number text,
  idempotency_key uuid UNIQUE,
  customer_fiscal_code text,
  customer_address text,
  provider_cost_total numeric DEFAULT NULL::numeric CHECK (provider_cost_total IS NULL OR provider_cost_total >= 0::numeric),
  stripe_fee numeric DEFAULT NULL::numeric CHECK (stripe_fee IS NULL OR stripe_fee >= 0::numeric),
  internal_margin numeric DEFAULT NULL::numeric,
  net_revenue numeric DEFAULT NULL::numeric,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  product_id uuid,
  CONSTRAINT booking_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profile(id),
  CONSTRAINT booking_availability_slot_id_fkey FOREIGN KEY (availability_slot_id) REFERENCES public.availability_slot(id)
);

-- Table: booking_events
CREATE TABLE IF NOT EXISTS public.booking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['created'::text, 'cancelled'::text, 'modified'::text])),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text])),
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  CONSTRAINT booking_events_pkey PRIMARY KEY (id),
  CONSTRAINT booking_events_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id)
);

-- Table: cancellation_request
CREATE TABLE IF NOT EXISTS public.cancellation_request (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  cancellation_token text NOT NULL UNIQUE,
  order_number text NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by text,
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cancellation_request_pkey PRIMARY KEY (id),
  CONSTRAINT cancellation_request_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id)
);

-- Table: faq
CREATE TABLE IF NOT EXISTS public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (length(question) > 0),
  answer text NOT NULL CHECK (length(answer) > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_pkey PRIMARY KEY (id)
);

-- Table: product_faq
CREATE TABLE IF NOT EXISTS public.product_faq (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type = ANY (ARRAY['experience'::text, 'class'::text, 'trip'::text])),
  faq_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_faq_pkey PRIMARY KEY (id),
  CONSTRAINT product_faq_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faq(id)
);

-- Table: product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type = ANY (ARRAY['class'::text, 'experience'::text, 'trip'::text])),
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id)
);

-- Table: signup_code
CREATE TABLE IF NOT EXISTS public.signup_code (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  used boolean DEFAULT false,
  used_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  CONSTRAINT signup_code_pkey PRIMARY KEY (id),
  CONSTRAINT signup_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id)
);

-- Table: trip_program_day
CREATE TABLE IF NOT EXISTS public.trip_program_day (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type = ANY (ARRAY['experience'::text, 'class'::text, 'trip'::text])),
  day_number integer NOT NULL CHECK (day_number > 0),
  introduction text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_program_day_pkey PRIMARY KEY (id),
  CONSTRAINT trip_program_day_unique_product_day UNIQUE (product_id, product_type, day_number)
);

-- Table: trip_program_item
CREATE TABLE IF NOT EXISTS public.trip_program_item (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL,
  activity_text text NOT NULL CHECK (length(activity_text) > 0),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_program_item_pkey PRIMARY KEY (id),
  CONSTRAINT trip_program_item_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.trip_program_day(id)
);

-- Table: user_role
CREATE TABLE IF NOT EXISTS public.user_role (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_role_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_role_user_id_role_unique UNIQUE (user_id, role)
);

-- Table: order
CREATE TABLE IF NOT EXISTS public.order (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_pkey PRIMARY KEY (id),
  CONSTRAINT order_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS experience_provider_idx ON public.experience (provider_id);
CREATE INDEX IF NOT EXISTS experience_pricing_type_idx ON public.experience (pricing_type);
CREATE INDEX IF NOT EXISTS experience_active_idx ON public.experience (active);

CREATE INDEX IF NOT EXISTS class_provider_idx ON public.class (provider_id);
CREATE INDEX IF NOT EXISTS class_pricing_type_idx ON public.class (pricing_type);
CREATE INDEX IF NOT EXISTS class_active_idx ON public.class (active);

CREATE INDEX IF NOT EXISTS trip_provider_idx ON public.trip (provider_id);
CREATE INDEX IF NOT EXISTS trip_pricing_type_idx ON public.trip (pricing_type);
CREATE INDEX IF NOT EXISTS trip_location_idx ON public.trip (location);
CREATE INDEX IF NOT EXISTS trip_dates_idx ON public.trip (start_date, end_date);
CREATE INDEX IF NOT EXISTS trip_active_idx ON public.trip (active);

CREATE INDEX IF NOT EXISTS availability_slot_product_idx ON public.availability_slot (product_id, product_type);
CREATE INDEX IF NOT EXISTS availability_slot_date_idx ON public.availability_slot (date);

CREATE INDEX IF NOT EXISTS booking_customer_idx ON public.booking (customer_email);
CREATE INDEX IF NOT EXISTS booking_product_idx ON public.booking (product_type, product_id);
CREATE INDEX IF NOT EXISTS booking_stripe_session_idx ON public.booking (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS booking_status_idx ON public.booking (status);
CREATE INDEX IF NOT EXISTS booking_created_at_idx ON public.booking (created_at);
CREATE INDEX IF NOT EXISTS booking_provider_idx ON public.booking (provider_id);
CREATE INDEX IF NOT EXISTS booking_availability_slot_idx ON public.booking (availability_slot_id);

CREATE INDEX IF NOT EXISTS booking_events_booking_idx ON public.booking_events (booking_id);
CREATE INDEX IF NOT EXISTS booking_events_status_idx ON public.booking_events (status);

CREATE INDEX IF NOT EXISTS cancellation_request_booking_idx ON public.cancellation_request (booking_id);
CREATE INDEX IF NOT EXISTS cancellation_request_token_idx ON public.cancellation_request (cancellation_token);
CREATE INDEX IF NOT EXISTS cancellation_request_status_idx ON public.cancellation_request (status);
CREATE INDEX IF NOT EXISTS cancellation_request_requested_at_idx ON public.cancellation_request (requested_at);

CREATE INDEX IF NOT EXISTS product_faq_product_idx ON public.product_faq (product_id, product_type);
CREATE INDEX IF NOT EXISTS product_faq_faq_idx ON public.product_faq (faq_id);

CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images (product_id, product_type);

CREATE INDEX IF NOT EXISTS trip_program_day_product_idx ON public.trip_program_day (product_id, product_type);
CREATE INDEX IF NOT EXISTS trip_program_item_day_idx ON public.trip_program_item (day_id);

CREATE INDEX IF NOT EXISTS user_role_user_idx ON public.user_role (user_id);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS experience_set_updated_at ON public.experience;
CREATE TRIGGER experience_set_updated_at
BEFORE UPDATE ON public.experience
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS class_set_updated_at ON public.class;
CREATE TRIGGER class_set_updated_at
BEFORE UPDATE ON public.class
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trip_set_updated_at ON public.trip;
CREATE TRIGGER trip_set_updated_at
BEFORE UPDATE ON public.trip
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS booking_set_updated_at ON public.booking;
CREATE TRIGGER booking_set_updated_at
BEFORE UPDATE ON public.booking
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS cancellation_request_set_updated_at ON public.cancellation_request;
CREATE TRIGGER cancellation_request_set_updated_at
BEFORE UPDATE ON public.cancellation_request
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS faq_set_updated_at ON public.faq;
CREATE TRIGGER faq_set_updated_at
BEFORE UPDATE ON public.faq
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS product_faq_set_updated_at ON public.product_faq;
CREATE TRIGGER product_faq_set_updated_at
BEFORE UPDATE ON public.product_faq
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS product_images_set_updated_at ON public.product_images;
CREATE TRIGGER product_images_set_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trip_program_day_set_updated_at ON public.trip_program_day;
CREATE TRIGGER trip_program_day_set_updated_at
BEFORE UPDATE ON public.trip_program_day
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trip_program_item_set_updated_at ON public.trip_program_item;
CREATE TRIGGER trip_program_item_set_updated_at
BEFORE UPDATE ON public.trip_program_item
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS order_set_updated_at ON public.order;
CREATE TRIGGER order_set_updated_at
BEFORE UPDATE ON public.order
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function: is_cancellation_token_valid
CREATE OR REPLACE FUNCTION public.is_cancellation_token_valid(
  _booking_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _booking record;
  _expiry_datetime timestamptz;
BEGIN
  SELECT 
    booking_date,
    trip_end_date
  INTO _booking
  FROM public.booking
  WHERE id = _booking_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF _booking.trip_end_date IS NOT NULL THEN
    _expiry_datetime := (_booking.trip_end_date + interval '1 day' + time '23:59:59')::timestamptz;
  ELSE
    _expiry_datetime := (_booking.booking_date + interval '1 day' + time '23:59:59')::timestamptz;
  END IF;
  
  RETURN now() <= _expiry_datetime;
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_program_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_program_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added in a separate migration or manually
-- as they depend on specific business logic requirements

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.cancellation_request IS 'Tracks customer cancellation requests for bookings. Processed manually by admin.';
COMMENT ON COLUMN public.cancellation_request.cancellation_token IS 'Secure token for magic link access. Valid until 24h after booking/trip end date.';
COMMENT ON COLUMN public.cancellation_request.status IS 'pending: awaiting admin action, approved: admin approved (booking will be cancelled), rejected: admin rejected, cancelled: customer cancelled their request';

-- ✅ Schema completo applicato!
