-- ============================================
-- Test Script per Sistema Programma Prodotto
-- ============================================
-- ⚠️ IMPORTANTE: Prima di eseguire questo script, devi applicare la migration!
-- 
-- Istruzioni:
-- 1. Vai su Supabase Dashboard → SQL Editor
-- 2. Apri: supabase/migrations/20250116000002_add_product_program.sql
-- 3. Copia TUTTO il contenuto e eseguilo
-- 4. Poi torna qui ed esegui questo script di test
-- 
-- Oppure consulta: APPLICA_MIGRATION_PROGRAMMA.md
-- ============================================

-- Test 1: Verifica che le tabelle esistano
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_program_day') THEN
    RAISE EXCEPTION '❌ ERRORE: Tabella trip_program_day non trovata!%Applica prima la migration: supabase/migrations/20250116000002_add_product_program.sql%Vedi APPLICA_MIGRATION_PROGRAMMA.md per istruzioni dettagliate';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_program_item') THEN
    RAISE EXCEPTION '❌ ERRORE: Tabella trip_program_item non trovata!%Applica prima la migration: supabase/migrations/20250116000002_add_product_program.sql%Vedi APPLICA_MIGRATION_PROGRAMMA.md per istruzioni dettagliate';
  END IF;
  
  RAISE NOTICE '✅ Tabelle verificate con successo';
END $$;

-- Test 2: Crea programma per un'esperienza
DO $$
DECLARE
  exp_id UUID;
  day_id UUID;
BEGIN
  -- Trova la prima esperienza attiva
  SELECT id INTO exp_id FROM experience WHERE active = true LIMIT 1;
  
  IF exp_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessuna esperienza attiva trovata. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per esperienza: %', exp_id;
    
    -- Elimina programma esistente se presente
    DELETE FROM trip_program_day WHERE product_id = exp_id AND product_type = 'experience';
    
    -- Crea giorno
    INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
    VALUES (exp_id, 'experience', 1, 'Una giornata indimenticabile nella natura con il tuo amico a quattro zampe!')
    RETURNING id INTO day_id;
    
    -- Crea attività
    INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
      (day_id, 'Ritrovo alle 9:00 al punto di incontro', 0),
      (day_id, 'Passeggiata guidata di 2 ore nel bosco', 1),
      (day_id, 'Pausa pranzo al sacco (non incluso)', 2),
      (day_id, 'Attività di socializzazione tra cani', 3),
      (day_id, 'Rientro previsto alle 17:00', 4);
    
    RAISE NOTICE '✅ Programma esperienza creato con successo';
  END IF;
END $$;

-- Test 3: Crea programma per una classe
DO $$
DECLARE
  class_id UUID;
  day_id UUID;
BEGIN
  -- Trova la prima classe attiva
  SELECT id INTO class_id FROM class WHERE active = true LIMIT 1;
  
  IF class_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessuna classe attiva trovata. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per classe: %', class_id;
    
    -- Elimina programma esistente se presente
    DELETE FROM trip_program_day WHERE product_id = class_id AND product_type = 'class';
    
    -- Crea giorno
    INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
    VALUES (class_id, 'class', 1, 'Un corso completo per migliorare la comunicazione con il tuo cane.')
    RETURNING id INTO day_id;
    
    -- Crea attività
    INSERT INTO trip_program_item (day_id, activity_text, order_index) VALUES
      (day_id, 'Teoria: Comunicazione e linguaggio del corpo', 0),
      (day_id, 'Esercizi pratici di base', 1),
      (day_id, 'Pausa caffè (inclusa)', 2),
      (day_id, 'Socializzazione guidata', 3),
      (day_id, 'Domande e risposte finali', 4);
    
    RAISE NOTICE '✅ Programma classe creato con successo';
  END IF;
END $$;

-- Test 4: Crea programma per un viaggio
DO $$
DECLARE
  trip_id UUID;
  trip_duration INTEGER;
  day_id UUID;
  day_num INTEGER;
BEGIN
  -- Trova il primo viaggio attivo
  SELECT id, duration_days INTO trip_id, trip_duration FROM trip WHERE active = true LIMIT 1;
  
  IF trip_id IS NULL THEN
    RAISE NOTICE '⚠️  Nessun viaggio attivo trovato. Salto questo test.';
  ELSE
    RAISE NOTICE '📋 Creando programma per viaggio: % (durata: % giorni)', trip_id, trip_duration;
    
    -- Elimina programma esistente se presente
    DELETE FROM trip_program_day WHERE product_id = trip_id AND product_type = 'trip';
    
    -- Crea giorni (massimo 3 per il test)
    FOR day_num IN 1..LEAST(COALESCE(trip_duration, 3), 3) LOOP
      -- Crea giorno
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
      
      -- Crea attività per il giorno
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

-- Test 5: Verifica i programmi creati
SELECT 
  'Riepilogo Programmi Creati' as test_name,
  product_type,
  COUNT(DISTINCT product_id) as prodotti_con_programma,
  COUNT(*) as giorni_totali,
  SUM((SELECT COUNT(*) FROM trip_program_item WHERE day_id = trip_program_day.id)) as attivita_totali
FROM trip_program_day
GROUP BY product_type
ORDER BY product_type;

-- Test 6: Verifica constraint (dovrebbe fallire)
DO $$
DECLARE
  test_product_id UUID;
  test_day_id UUID;
BEGIN
  -- Trova un prodotto per il test
  SELECT id INTO test_product_id FROM experience WHERE active = true LIMIT 1;
  
  IF test_product_id IS NOT NULL THEN
    -- Crea un giorno
    INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
    VALUES (test_product_id, 'experience', 1, 'Test')
    RETURNING id INTO test_day_id;
    
    -- Prova a creare un giorno duplicato (dovrebbe fallire)
    BEGIN
      INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
      VALUES (test_product_id, 'experience', 1, 'Test duplicato');
      RAISE NOTICE '❌ ERRORE: Constraint univoco non funziona!';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE '✅ Constraint univoco funziona correttamente';
    END;
    
    -- Pulisci
    DELETE FROM trip_program_day WHERE id = test_day_id;
  END IF;
END $$;

-- Test 7: Verifica constraint activity_text non vuoto (dovrebbe fallire)
DO $$
DECLARE
  test_day_id UUID;
BEGIN
  -- Trova un giorno esistente
  SELECT id INTO test_day_id FROM trip_program_day LIMIT 1;
  
  IF test_day_id IS NOT NULL THEN
    BEGIN
      INSERT INTO trip_program_item (day_id, activity_text, order_index)
      VALUES (test_day_id, '', 999);
      RAISE NOTICE '❌ ERRORE: Constraint testo non vuoto non funziona!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE '✅ Constraint testo non vuoto funziona correttamente';
    END;
  END IF;
END $$;

-- Test 8: Verifica constraint day_number > 0 (dovrebbe fallire)
DO $$
DECLARE
  test_product_id UUID;
BEGIN
  SELECT id INTO test_product_id FROM experience WHERE active = true LIMIT 1;
  
  IF test_product_id IS NOT NULL THEN
    BEGIN
      INSERT INTO trip_program_day (product_id, product_type, day_number, introduction)
      VALUES (test_product_id, 'experience', 0, 'Test');
      RAISE NOTICE '❌ ERRORE: Constraint day_number > 0 non funziona!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE '✅ Constraint day_number > 0 funziona correttamente';
    END;
  END IF;
END $$;

-- Test 9: Mostra esempi di programmi creati
SELECT 
  'Esempi Programmi' as test_name,
  pd.product_type,
  pd.day_number,
  pd.introduction,
  COUNT(pi.id) as num_attivita,
  STRING_AGG(pi.activity_text, ' | ' ORDER BY pi.order_index) as attivita
FROM trip_program_day pd
LEFT JOIN trip_program_item pi ON pi.day_id = pd.id
GROUP BY pd.product_type, pd.day_number, pd.introduction, pd.id
ORDER BY pd.product_type, pd.day_number
LIMIT 10;

-- Test 10: Messaggio finale
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Test completati!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Prossimi passi:';
  RAISE NOTICE '1. Verifica i programmi nel provider portal';
  RAISE NOTICE '2. Verifica la visualizzazione nel frontend ecommerce';
  RAISE NOTICE '3. Testa la creazione/modifica di programmi';
END $$;

