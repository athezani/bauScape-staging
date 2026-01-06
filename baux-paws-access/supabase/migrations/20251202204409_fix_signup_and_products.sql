-- ============================================
-- FIX SIGNUP ERROR: handle_new_user() function
-- ============================================

-- Step 1: Verifica quale tabella esiste (profile o profiles)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile') THEN
    RAISE NOTICE 'Tabella profile (singolare) esiste';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'Tabella profiles (plurale) esiste - verrà rinominata a profile';
    -- Rinomina la tabella da profiles a profile
    ALTER TABLE public.profiles RENAME TO profile;
    
    RAISE NOTICE 'Tabella rinominata da profiles a profile';
  ELSE
    RAISE NOTICE 'Nessuna tabella profile/profiles trovata - creazione necessaria';
  END IF;
END $$;

-- Step 1b: Rinomina indici e trigger se necessario (blocco separato per evitare nesting)
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  -- Rinomina gli indici da profiles_* a profile_*
  FOR idx_record IN (
    SELECT indexname FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'profiles_%'
  ) LOOP
    EXECUTE format('ALTER INDEX IF EXISTS public.%I RENAME TO %I', 
      idx_record.indexname, 
      replace(idx_record.indexname, 'profiles_', 'profile_'));
  END LOOP;
  
  -- Rinomina i trigger
  IF EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    ALTER TRIGGER update_profiles_updated_at ON public.profile RENAME TO update_profile_updated_at;
  END IF;
END $$;

-- Step 2: Aggiorna la funzione handle_new_user() per usare 'profile' (singolare)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile (id, email, company_name, contact_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name'),
    COALESCE(NEW.raw_user_meta_data->>'contact_name', 'Contact Name')
  )
  ON CONFLICT (id) DO NOTHING; -- Evita errori se il profile esiste già
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log dell'errore ma non bloccare la creazione dell'utente
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Verifica che il trigger esista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'Trigger on_auth_user_created creato';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created già esistente';
  END IF;
END $$;

-- ============================================
-- FIX PRODUCTS: Verifica RLS policies per tabelle prodotti
-- ============================================

-- Abilita RLS sulle tabelle prodotti se non già abilitato
ALTER TABLE IF EXISTS public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip ENABLE ROW LEVEL SECURITY;

-- Crea policy per permettere lettura pubblica dei prodotti (per customer website)
DO $$
BEGIN
  -- Policy per experience
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'experience' AND policyname = 'Public can view experiences'
  ) THEN
    CREATE POLICY "Public can view experiences"
    ON public.experience
    FOR SELECT
    USING (true);
    RAISE NOTICE 'Policy creata: Public can view experiences';
  END IF;

  -- Policy per class
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'class' AND policyname = 'Public can view classes'
  ) THEN
    CREATE POLICY "Public can view classes"
    ON public.class
    FOR SELECT
    USING (true);
    RAISE NOTICE 'Policy creata: Public can view classes';
  END IF;

  -- Policy per trip
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'trip' AND policyname = 'Public can view trips'
  ) THEN
    CREATE POLICY "Public can view trips"
    ON public.trip
    FOR SELECT
    USING (true);
    RAISE NOTICE 'Policy creata: Public can view trips';
  END IF;
END $$;

-- ============================================
-- VERIFICA STATO FINALE
-- ============================================

DO $$
DECLARE
  profile_count INTEGER;
  experience_count INTEGER;
  class_count INTEGER;
  trip_count INTEGER;
BEGIN
  -- Conta record nelle tabelle
  SELECT COUNT(*) INTO profile_count FROM public.profile;
  SELECT COUNT(*) INTO experience_count FROM public.experience;
  SELECT COUNT(*) INTO class_count FROM public.class;
  SELECT COUNT(*) INTO trip_count FROM public.trip;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STATO DATABASE:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile records: %', profile_count;
  RAISE NOTICE 'Experience records: %', experience_count;
  RAISE NOTICE 'Class records: %', class_count;
  RAISE NOTICE 'Trip records: %', trip_count;
  RAISE NOTICE '========================================';
  
  IF experience_count = 0 AND class_count = 0 AND trip_count = 0 THEN
    RAISE NOTICE 'ATTENZIONE: Nessun prodotto trovato nelle tabelle!';
    RAISE NOTICE 'Le tabelle sono vuote - devi inserire dei prodotti per vederli sul sito.';
  END IF;
END $$;

