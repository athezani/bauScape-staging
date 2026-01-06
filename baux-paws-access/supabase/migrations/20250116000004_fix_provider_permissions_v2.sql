-- ============================================
-- FIX PROVIDER PERMISSIONS FOR PRODUCTS - V2
-- ============================================
-- Assicura che i provider possano creare e modificare i propri prodotti
-- e che gli admin possano gestire tutti i prodotti
-- Questa versione rimuove tutte le policy esistenti e le ricrea da zero

-- Rimuovi TUTTE le policy esistenti per evitare conflitti
DO $$
BEGIN
  -- Rimuovi policy per class
  DROP POLICY IF EXISTS "Providers can manage own classes" ON public.class;
  DROP POLICY IF EXISTS "Admins can manage all classes" ON public.class;
  DROP POLICY IF EXISTS "Public can view classes" ON public.class;
  
  -- Rimuovi policy per experience
  DROP POLICY IF EXISTS "Providers can manage own experiences" ON public.experience;
  DROP POLICY IF EXISTS "Admins can manage all experiences" ON public.experience;
  DROP POLICY IF EXISTS "Public can view experiences" ON public.experience;
  
  -- Rimuovi policy per trip
  DROP POLICY IF EXISTS "Providers can manage own trips" ON public.trip;
  DROP POLICY IF EXISTS "Admins can manage all trips" ON public.trip;
  DROP POLICY IF EXISTS "Public can view trips" ON public.trip;
END $$;

-- ============================================
-- POLICY PER CLASS
-- ============================================

-- Policy: Lettura pubblica (anon e authenticated)
CREATE POLICY "Public can view classes"
ON public.class
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Provider può gestire i propri prodotti
CREATE POLICY "Providers can manage own classes"
ON public.class
FOR ALL
TO authenticated
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admin può gestire tutti i prodotti
CREATE POLICY "Admins can manage all classes"
ON public.class
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- POLICY PER EXPERIENCE
-- ============================================

-- Policy: Lettura pubblica (anon e authenticated)
CREATE POLICY "Public can view experiences"
ON public.experience
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Provider può gestire i propri prodotti
CREATE POLICY "Providers can manage own experiences"
ON public.experience
FOR ALL
TO authenticated
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admin può gestire tutti i prodotti
CREATE POLICY "Admins can manage all experiences"
ON public.experience
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- POLICY PER TRIP
-- ============================================

-- Policy: Lettura pubblica (anon e authenticated)
CREATE POLICY "Public can view trips"
ON public.trip
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Provider può gestire i propri prodotti
CREATE POLICY "Providers can manage own trips"
ON public.trip
FOR ALL
TO authenticated
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admin può gestire tutti i prodotti
CREATE POLICY "Admins can manage all trips"
ON public.trip
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- VERIFICA E LOG
-- ============================================

DO $$
DECLARE
  class_policies INTEGER;
  exp_policies INTEGER;
  trip_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO class_policies 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'class';
  
  SELECT COUNT(*) INTO exp_policies 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'experience';
  
  SELECT COUNT(*) INTO trip_policies 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'trip';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLICY RLS CREATE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Class policies: %', class_policies;
  RAISE NOTICE 'Experience policies: %', exp_policies;
  RAISE NOTICE 'Trip policies: %', trip_policies;
  RAISE NOTICE '========================================';
END $$;

COMMENT ON POLICY "Providers can manage own classes" ON public.class IS 
  'Permette ai provider di gestire i propri prodotti classe e agli admin di gestire tutti i prodotti';
COMMENT ON POLICY "Providers can manage own experiences" ON public.experience IS 
  'Permette ai provider di gestire i propri prodotti esperienza e agli admin di gestire tutti i prodotti';
COMMENT ON POLICY "Providers can manage own trips" ON public.trip IS 
  'Permette ai provider di gestire i propri prodotti viaggio e agli admin di gestire tutti i prodotti';

