-- ============================================
-- TEST COMPLETO SISTEMA PROGRAMMA PRODOTTO
-- ============================================
-- Questo script:
-- 1. Applica la migration (se non già applicata)
-- 2. Crea programmi di esempio
-- 3. Verifica tutto il sistema
-- ============================================

-- ============================================
-- PARTE 1: APPLICA MIGRATION (se necessario)
-- ============================================

DO $$
BEGIN
  -- Verifica se le tabelle esistono già
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_program_day') THEN
    RAISE NOTICE '📋 Creando tabelle...';
    
    -- Crea trip_program_day
    CREATE TABLE public.trip_program_day (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      product_type TEXT NOT NULL CHECK (product_type IN ('experience', 'class', 'trip')),
      day_number INTEGER NOT NULL CHECK (day_number > 0),
      introduction TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT trip_program_day_unique_product_day UNIQUE (product_id, product_type, day_number)
    );
    
    -- Crea trip_program_item
    CREATE TABLE public.trip_program_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      day_id UUID NOT NULL REFERENCES public.trip_program_day(id) ON DELETE CASCADE,
      activity_text TEXT NOT NULL CHECK (LENGTH(activity_text) > 0),
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Crea indici
    CREATE INDEX idx_trip_program_day_product 
      ON public.trip_program_day(product_id, product_type);
    CREATE INDEX idx_trip_program_day_product_day 
      ON public.trip_program_day(product_id, product_type, day_number);
    CREATE INDEX idx_trip_program_item_day 
      ON public.trip_program_item(day_id);
    CREATE INDEX idx_trip_program_item_order 
      ON public.trip_program_item(day_id, order_index);
    
    -- Crea trigger per updated_at
    CREATE OR REPLACE FUNCTION update_trip_program_day_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER trip_program_day_updated_at
      BEFORE UPDATE ON public.trip_program_day
      FOR EACH ROW
      EXECUTE FUNCTION update_trip_program_day_updated_at();
    
    CREATE OR REPLACE FUNCTION update_trip_program_item_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER trip_program_item_updated_at
      BEFORE UPDATE ON public.trip_program_item
      FOR EACH ROW
      EXECUTE FUNCTION update_trip_program_item_updated_at();
    
    -- Abilita RLS
    ALTER TABLE public.trip_program_day ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.trip_program_item ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ Tabelle, indici e trigger creati';
  ELSE
    RAISE NOTICE '✅ Tabelle già esistenti, salto la creazione';
  END IF;
END $$;

-- Crea RLS policies (fuori dal blocco DO perché CREATE POLICY non può essere dentro)
-- Usiamo DROP POLICY IF EXISTS per evitare errori se esistono già
DO $$
BEGIN
  -- Drop policies se esistono (per permettere re-esecuzione)
  DROP POLICY IF EXISTS trip_program_day_public_read_active ON public.trip_program_day;
  DROP POLICY IF EXISTS trip_program_day_insert_own_provider ON public.trip_program_day;
  DROP POLICY IF EXISTS trip_program_day_update_own_provider ON public.trip_program_day;
  DROP POLICY IF EXISTS trip_program_day_delete_own_provider ON public.trip_program_day;
  DROP POLICY IF EXISTS trip_program_item_public_read_active ON public.trip_program_item;
  DROP POLICY IF EXISTS trip_program_item_insert_own_provider ON public.trip_program_item;
  DROP POLICY IF EXISTS trip_program_item_update_own_provider ON public.trip_program_item;
  DROP POLICY IF EXISTS trip_program_item_delete_own_provider ON public.trip_program_item;
END $$;

CREATE POLICY trip_program_day_public_read_active
  ON public.trip_program_day FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.experience WHERE experience.id = trip_program_day.product_id AND experience.active = true)
    OR EXISTS (SELECT 1 FROM public.class WHERE class.id = trip_program_day.product_id AND class.active = true)
    OR EXISTS (SELECT 1 FROM public.trip WHERE trip.id = trip_program_day.product_id AND trip.active = true)
    OR EXISTS (SELECT 1 FROM public.experience WHERE experience.id = trip_program_day.product_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.class WHERE class.id = trip_program_day.product_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip WHERE trip.id = trip_program_day.product_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_day_insert_own_provider
  ON public.trip_program_day FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.experience WHERE experience.id = trip_program_day.product_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.class WHERE class.id = trip_program_day.product_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip WHERE trip.id = trip_program_day.product_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_day_update_own_provider
  ON public.trip_program_day FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.experience WHERE experience.id = trip_program_day.product_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.class WHERE class.id = trip_program_day.product_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip WHERE trip.id = trip_program_day.product_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_day_delete_own_provider
  ON public.trip_program_day FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.experience WHERE experience.id = trip_program_day.product_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.class WHERE class.id = trip_program_day.product_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip WHERE trip.id = trip_program_day.product_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_item_public_read_active
  ON public.trip_program_item FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.experience ON experience.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND experience.active = true)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.class ON class.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND class.active = true)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.trip ON trip.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND trip.active = true)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.experience ON experience.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.class ON class.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.trip ON trip.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_item_insert_own_provider
  ON public.trip_program_item FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.experience ON experience.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.class ON class.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.trip ON trip.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_item_update_own_provider
  ON public.trip_program_item FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.experience ON experience.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.class ON class.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.trip ON trip.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND trip.provider_id::text = auth.uid()::text)
  );

CREATE POLICY trip_program_item_delete_own_provider
  ON public.trip_program_item FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.experience ON experience.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND experience.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.class ON class.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND class.provider_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.trip_program_day JOIN public.trip ON trip.id = trip_program_day.product_id WHERE trip_program_day.id = trip_program_item.day_id AND trip.provider_id::text = auth.uid()::text)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies create';
END $$;

-- ============================================
-- PARTE 2: CREA PROGRAMMI DI ESEMPIO
-- ============================================

-- Test: Crea programma per un'esperienza
DO $$
DECLARE
  exp_id UUID;
  day_id UUID;
BEGIN
  SELECT id INTO exp_id FROM experience WHERE active = true LIMIT 1;
  
  IF exp_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessuna esperienza attiva trovata. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per esperienza: %', exp_id;
    
    DELETE FROM trip_program_day WHERE product_id = exp_id AND product_type = 'experience';
    
    INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
    VALUES (exp_id, 'experience', 1, 'Una giornata indimenticabile nella natura con il tuo amico a quattro zampe!')
    RETURNING id INTO day_id;
    
    INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
      (day_id, 'Ritrovo alle 9:00 al punto di incontro', 0),
      (day_id, 'Passeggiata guidata di 2 ore nel bosco', 1),
      (day_id, 'Pausa pranzo al sacco (non incluso)', 2),
      (day_id, 'Attività di socializzazione tra cani', 3),
      (day_id, 'Rientro previsto alle 17:00', 4);
    
    RAISE NOTICE '✅ Programma esperienza creato con successo';
  END IF;
END $$;

-- Test: Crea programma per una classe
DO $$
DECLARE
  class_id UUID;
  day_id UUID;
BEGIN
  SELECT id INTO class_id FROM class WHERE active = true LIMIT 1;
  
  IF class_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessuna classe attiva trovata. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per classe: %', class_id;
    
    DELETE FROM trip_program_day WHERE product_id = class_id AND product_type = 'class';
    
    INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
    VALUES (class_id, 'class', 1, 'Un corso completo per migliorare la comunicazione con il tuo cane.')
    RETURNING id INTO day_id;
    
    INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
      (day_id, 'Teoria: Comunicazione e linguaggio del corpo', 0),
      (day_id, 'Esercizi pratici di base', 1),
      (day_id, 'Pausa caffè (inclusa)', 2),
      (day_id, 'Socializzazione guidata', 3),
      (day_id, 'Domande e risposte finali', 4);
    
    RAISE NOTICE '✅ Programma classe creato con successo';
  END IF;
END $$;

-- Test: Crea programma per un viaggio
DO $$
DECLARE
  trip_id UUID;
  trip_duration INTEGER;
  day_id UUID;
  day_num INTEGER;
BEGIN
  SELECT id, duration_days INTO trip_id, trip_duration FROM trip WHERE active = true LIMIT 1;
  
  IF trip_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessun viaggio attivo trovato. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per viaggio: % (durata: % giorni)', trip_id, trip_duration;
    
    DELETE FROM trip_program_day WHERE product_id = trip_id AND product_type = 'trip';
    
    FOR day_num IN 1..LEAST(COALESCE(trip_duration, 3), 3) LOOP
      INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
      VALUES (
        trip_id,
        'trip',
        day_num,
        CASE day_num
          WHEN 1 THEN 'Giorno di arrivo e accoglienza. Iniziamo questa avventura insieme!'
          WHEN 2 THEN 'Giornata dedicata alle escursioni e alle attività principali.'
          ELSE 'Giorno finale con attività di chiusura e saluti.'
        END
      )
      RETURNING id INTO day_id;
      
      IF day_num = 1 THEN
        INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
          (day_id, 'Arrivo e check-in alle 14:00', 0),
          (day_id, 'Presentazione del gruppo e briefing iniziale', 1),
          (day_id, 'Passeggiata di benvenuto', 2),
          (day_id, 'Cena di gruppo (inclusa)', 3);
      ELSIF day_num = 2 THEN
        INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
          (day_id, 'Colazione alle 8:00', 0),
          (day_id, 'Escursione guidata di mezza giornata', 1),
          (day_id, 'Pranzo al sacco (incluso)', 2),
          (day_id, 'Attività pomeridiane a scelta', 3),
          (day_id, 'Cena e serata libera', 4);
      ELSE
        INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
          (day_id, 'Colazione e check-out', 0),
          (day_id, 'Escursione finale breve', 1),
          (day_id, 'Saluti e partenza', 2);
      END IF;
      
      RAISE NOTICE '✅ Giorno % creato con successo', day_num;
    END LOOP;
    
    RAISE NOTICE '✅ Programma viaggio creato con successo';
  END IF;
END $$;

-- ============================================
-- PARTE 3: VERIFICA E RIEPILOGO
-- ============================================

-- Riepilogo programmi creati
SELECT 
  'Riepilogo Programmi' as test_name,
  product_type,
  COUNT(DISTINCT product_id) as prodotti_con_programma,
  COUNT(*) as giorni_totali,
  SUM((SELECT COUNT(*) FROM trip_program_item WHERE day_id = trip_program_day.id)) as attivita_totali
FROM trip_program_day
GROUP BY product_type
ORDER BY product_type;

-- Mostra esempi di programmi creati
SELECT 
  'Esempi Programmi' as test_name,
  pd.product_type,
  pd.day_number,
  LEFT(pd.introduction, 50) as introduction_preview,
  COUNT(pi.id) as num_attivita,
  STRING_AGG(LEFT(pi.activity_text, 30), ' | ' ORDER BY pi.order_index) as attivita_preview
FROM trip_program_day pd
LEFT JOIN trip_program_item pi ON pi.day_id = pd.id
GROUP BY pd.product_type, pd.day_number, pd.introduction, pd.id
ORDER BY pd.product_type, pd.day_number
LIMIT 10;

-- Messaggio finale
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TEST COMPLETATI CON SUCCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Prossimi passi:';
  RAISE NOTICE '1. Verifica i programmi nel provider portal';
  RAISE NOTICE '2. Verifica la visualizzazione nel frontend ecommerce';
  RAISE NOTICE '3. Testa la creazione/modifica di programmi';
END $$;
