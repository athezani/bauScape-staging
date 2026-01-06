-- Add RLS policies for admins to manage all products

-- Class policies for admin
CREATE POLICY "Admins can manage all classes"
ON public.class
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Experience policies for admin
CREATE POLICY "Admins can manage all experiences"
ON public.experience
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trip policies for admin
CREATE POLICY "Admins can manage all trips"
ON public.trip
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));