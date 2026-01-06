-- Fix 1: Remove public SELECT policy from signup_codes to prevent code enumeration
DROP POLICY IF EXISTS "Anyone can check if code exists and is unused" ON public.signup_codes;

-- Fix 2: Add explicit DENY policy for bookings INSERT (bookings come only from Shopify)
CREATE POLICY "Deny provider booking creation"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (false);

-- Fix 3: Create booking status transition validation function
CREATE OR REPLACE FUNCTION public.validate_booking_status_change(
  _booking_id uuid,
  _new_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
  _provider_id uuid;
BEGIN
  -- Get current status and verify ownership
  SELECT status, provider_id INTO _current_status, _provider_id
  FROM public.bookings 
  WHERE id = _booking_id;
  
  -- Verify the booking exists and belongs to the current user
  IF _provider_id IS NULL OR _provider_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Block changes from terminal states
  IF _current_status IN ('completed', 'cancelled') THEN
    RETURN false;
  END IF;
  
  -- Valid transitions only
  IF _current_status = 'pending' AND _new_status IN ('confirmed', 'cancelled') THEN
    RETURN true;
  ELSIF _current_status = 'confirmed' AND _new_status IN ('completed', 'cancelled') THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Fix 4: Add explicit DELETE policy to profiles table
CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 5: Add explicit INSERT/DELETE policies to user_roles for defense-in-depth
CREATE POLICY "Non-admins cannot insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Non-admins cannot delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));