-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'provider');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create signup_codes table
CREATE TABLE public.signup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on signup_codes
ALTER TABLE public.signup_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for signup_codes
CREATE POLICY "Anyone can check if code exists and is unused"
  ON public.signup_codes
  FOR SELECT
  USING (NOT used);

CREATE POLICY "Admins can manage signup codes"
  ON public.signup_codes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to validate and consume signup code
CREATE OR REPLACE FUNCTION public.validate_signup_code(_code TEXT, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_exists BOOLEAN;
BEGIN
  -- Check if code exists and is unused
  SELECT EXISTS (
    SELECT 1 FROM public.signup_codes
    WHERE code = _code AND used = FALSE
  ) INTO code_exists;
  
  IF code_exists THEN
    -- Mark code as used
    UPDATE public.signup_codes
    SET used = TRUE, used_by = _user_id, used_at = NOW()
    WHERE code = _code;
    
    -- Assign provider role to user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'provider');
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to generate signup code
CREATE OR REPLACE FUNCTION public.generate_signup_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate signup codes';
  END IF;
  
  -- Generate random code (8 characters)
  new_code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Insert new code
  INSERT INTO public.signup_codes (code)
  VALUES (new_code);
  
  RETURN new_code;
END;
$$;