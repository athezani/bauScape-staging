-- Rename all tables to singular form (only if plural tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
    ALTER TABLE public.bookings RENAME TO booking;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'class') THEN
    ALTER TABLE public.classes RENAME TO class;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'experiences')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'experience') THEN
    ALTER TABLE public.experiences RENAME TO experience;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trips')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trip') THEN
    ALTER TABLE public.trips RENAME TO trip;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile') THEN
    ALTER TABLE public.profiles RENAME TO profile;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'signup_codes')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'signup_code') THEN
    ALTER TABLE public.signup_codes RENAME TO signup_code;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_role') THEN
    ALTER TABLE public.user_roles RENAME TO user_role;
  END IF;
END $$;

-- Update function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Update function: validate_signup_code
CREATE OR REPLACE FUNCTION public.validate_signup_code(_code text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.signup_code
    WHERE code = _code AND used = FALSE
  ) INTO code_exists;
  
  IF code_exists THEN
    UPDATE public.signup_code
    SET used = TRUE, used_by = _user_id, used_at = NOW()
    WHERE code = _code;
    
    INSERT INTO public.user_role (user_id, role)
    VALUES (_user_id, 'provider'::app_role);
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

-- Update function: generate_signup_code
CREATE OR REPLACE FUNCTION public.generate_signup_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can generate signup codes';
  END IF;
  
  new_code := upper(substring(md5(random()::text) from 1 for 8));
  
  INSERT INTO public.signup_code (code)
  VALUES (new_code);
  
  RETURN new_code;
END;
$function$;

-- Update function: validate_booking_status_change
CREATE OR REPLACE FUNCTION public.validate_booking_status_change(_booking_id uuid, _new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_status text;
  _provider_id uuid;
BEGIN
  SELECT status, provider_id INTO _current_status, _provider_id
  FROM public.booking 
  WHERE id = _booking_id;
  
  IF _provider_id IS NULL OR _provider_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  IF _current_status IN ('completed', 'cancelled') THEN
    RETURN false;
  END IF;
  
  IF _new_status = 'completed' THEN
    RETURN false;
  END IF;
  
  IF _current_status = 'pending' AND _new_status IN ('confirmed', 'cancelled') THEN
    RETURN true;
  ELSIF _current_status = 'confirmed' AND _new_status = 'cancelled' THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;

-- Update function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profile (id, email, company_name, contact_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name'),
    COALESCE(NEW.raw_user_meta_data->>'contact_name', 'Contact Name')
  );
  RETURN NEW;
END;
$function$;