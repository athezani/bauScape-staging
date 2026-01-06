-- ============================================
-- FIX PROVIDER PERMISSIONS FOR PRODUCTS
-- ============================================
-- Assicura che i provider possano creare e modificare i propri prodotti
-- e che gli admin possano gestire tutti i prodotti

-- Rimuovi policy esistenti per provider se esistono (potrebbero essere duplicate)
DROP POLICY IF EXISTS "Providers can manage own classes" ON public.class;
DROP POLICY IF EXISTS "Providers can manage own experiences" ON public.experience;
DROP POLICY IF EXISTS "Providers can manage own trips" ON public.trip;

-- Policy per provider: possono gestire i propri prodotti
CREATE POLICY "Providers can manage own classes"
ON public.class
FOR ALL
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Providers can manage own experiences"
ON public.experience
FOR ALL
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Providers can manage own trips"
ON public.trip
FOR ALL
USING (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  provider_id::text = auth.uid()::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Verifica che le policy admin esistano (già create in 20251201181910)
-- Se non esistono, le creiamo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'class' 
    AND policyname = 'Admins can manage all classes'
  ) THEN
    CREATE POLICY "Admins can manage all classes"
    ON public.class
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'experience' 
    AND policyname = 'Admins can manage all experiences'
  ) THEN
    CREATE POLICY "Admins can manage all experiences"
    ON public.experience
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'trip' 
    AND policyname = 'Admins can manage all trips'
  ) THEN
    CREATE POLICY "Admins can manage all trips"
    ON public.trip
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

COMMENT ON POLICY "Providers can manage own classes" ON public.class IS 
  'Permette ai provider di gestire i propri prodotti classe e agli admin di gestire tutti i prodotti';
COMMENT ON POLICY "Providers can manage own experiences" ON public.experience IS 
  'Permette ai provider di gestire i propri prodotti esperienza e agli admin di gestire tutti i prodotti';
COMMENT ON POLICY "Providers can manage own trips" ON public.trip IS 
  'Permette ai provider di gestire i propri prodotti viaggio e agli admin di gestire tutti i prodotti';

