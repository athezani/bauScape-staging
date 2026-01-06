-- Add active status to profile table
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Insert admin role for a.thezani@gmail.com (if user exists and role doesn't exist)
-- Only insert if the user exists in auth.users
INSERT INTO public.user_role (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'a.thezani@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.users.id AND role = 'admin'::app_role
  )
LIMIT 1;

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profile
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profile
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.booking
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));