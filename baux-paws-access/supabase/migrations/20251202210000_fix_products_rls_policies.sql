-- ============================================
-- FIX PRODUCTS RLS POLICIES - Assicura lettura pubblica
-- ============================================

-- Rimuovi tutte le policies esistenti che potrebbero bloccare la lettura pubblica
DROP POLICY IF EXISTS "Public can view experiences" ON public.experience;
DROP POLICY IF EXISTS "Public can view classes" ON public.class;
DROP POLICY IF EXISTS "Public can view trips" ON public.trip;

-- Crea policy permettere lettura pubblica (anonimo) per experience
CREATE POLICY "Public can view experiences"
ON public.experience
FOR SELECT
TO anon, authenticated
USING (true);

-- Crea policy permettere lettura pubblica (anonimo) per class
CREATE POLICY "Public can view classes"
ON public.class
FOR SELECT
TO anon, authenticated
USING (true);

-- Crea policy permettere lettura pubblica (anonimo) per trip
CREATE POLICY "Public can view trips"
ON public.trip
FOR SELECT
TO anon, authenticated
USING (true);

-- Verifica che RLS sia abilitato
ALTER TABLE IF EXISTS public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip ENABLE ROW LEVEL SECURITY;

-- Log per debug
DO $$
DECLARE
  exp_count INTEGER;
  class_count INTEGER;
  trip_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exp_count FROM public.experience;
  SELECT COUNT(*) INTO class_count FROM public.class;
  SELECT COUNT(*) INTO trip_count FROM public.trip;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRODOTTI NEL DATABASE:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Experience: %', exp_count;
  RAISE NOTICE 'Class: %', class_count;
  RAISE NOTICE 'Trip: %', trip_count;
  RAISE NOTICE 'Totale: %', exp_count + class_count + trip_count;
  RAISE NOTICE '========================================';
END $$;



