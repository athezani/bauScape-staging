-- ============================================
-- Assign 10 products to lastminute.com provider
-- ============================================
-- This migration associates 10 products (mixed from experience, class, trip)
-- to the provider "lastminute.com"

DO $$
DECLARE
  lastminute_provider_id UUID;
  product_count INTEGER := 0;
  experience_count INTEGER;
  class_count INTEGER;
  trip_count INTEGER;
  remaining_count INTEGER;
BEGIN
  -- Step 1: Trova o crea il provider "lastminute.com"
  SELECT id INTO lastminute_provider_id
  FROM public.profile
  WHERE LOWER(company_name) LIKE '%lastminute%' OR LOWER(company_name) LIKE '%last minute%'
  LIMIT 1;
  
  -- Se non esiste, cerca un provider esistente qualsiasi e aggiorna il nome
  IF lastminute_provider_id IS NULL THEN
    SELECT id INTO lastminute_provider_id
    FROM public.profile
    WHERE active = true
    LIMIT 1;
    
    IF lastminute_provider_id IS NULL THEN
      RAISE NOTICE 'Nessun provider trovato. Assicurati che esista almeno un provider nel sistema.';
      RETURN;
    ELSE
      -- Aggiorna il nome del provider esistente
      UPDATE public.profile
      SET company_name = 'lastminute.com'
      WHERE id = lastminute_provider_id;
      RAISE NOTICE 'Provider esistente aggiornato a: lastminute.com (ID: %)', lastminute_provider_id;
    END IF;
  ELSE
    RAISE NOTICE 'Provider trovato: lastminute.com (ID: %)', lastminute_provider_id;
  END IF;
  
  -- Step 2: Conta quanti prodotti di ogni tipo sono disponibili
  SELECT COUNT(*) INTO experience_count
  FROM public.experience
  WHERE active = true;
  
  SELECT COUNT(*) INTO class_count
  FROM public.class
  WHERE active = true;
  
  SELECT COUNT(*) INTO trip_count
  FROM public.trip
  WHERE active = true;
  
  RAISE NOTICE 'Prodotti disponibili - Experiences: %, Classes: %, Trips: %', experience_count, class_count, trip_count;
  
  -- Step 3: Associa 10 prodotti in modo bilanciato
  -- Distribuzione: 4 experiences, 3 classes, 3 trips (o proporzionale se non ci sono abbastanza)
  
  -- Associa experiences (fino a 4, o tutti se meno di 4)
  IF experience_count > 0 THEN
    UPDATE public.experience
    SET provider_id = lastminute_provider_id
    WHERE id IN (
      SELECT id
      FROM public.experience
      WHERE active = true
      ORDER BY created_at DESC
      LIMIT LEAST(4, experience_count)
    );
    
    GET DIAGNOSTICS product_count = ROW_COUNT;
    RAISE NOTICE 'Associate % experiences al provider lastminute.com', product_count;
  END IF;
  
  -- Associa classes (fino a 3, o tutti se meno di 3)
  remaining_count := 10 - product_count;
  IF class_count > 0 AND remaining_count > 0 THEN
    UPDATE public.class
    SET provider_id = lastminute_provider_id
    WHERE id IN (
      SELECT id
      FROM public.class
      WHERE active = true
      ORDER BY created_at DESC
      LIMIT LEAST(LEAST(3, remaining_count), class_count)
    );
    
    GET DIAGNOSTICS remaining_count = ROW_COUNT;
    product_count := product_count + remaining_count;
    RAISE NOTICE 'Associate % classes al provider lastminute.com', remaining_count;
  END IF;
  
  -- Associa trips (fino a 3, o tutti se meno di 3, per arrivare a 10 totali)
  remaining_count := 10 - product_count;
  IF trip_count > 0 AND remaining_count > 0 THEN
    UPDATE public.trip
    SET provider_id = lastminute_provider_id
    WHERE id IN (
      SELECT id
      FROM public.trip
      WHERE active = true
      ORDER BY created_at DESC
      LIMIT LEAST(remaining_count, trip_count)
    );
    
    GET DIAGNOSTICS remaining_count = ROW_COUNT;
    product_count := product_count + remaining_count;
    RAISE NOTICE 'Associate % trips al provider lastminute.com', remaining_count;
  END IF;
  
  -- Se non abbiamo ancora raggiunto 10 prodotti, riempi con quello che c'è
  IF product_count < 10 THEN
    remaining_count := 10 - product_count;
    
    -- Prova con più experiences se disponibili
    IF experience_count > 4 AND remaining_count > 0 THEN
      UPDATE public.experience
      SET provider_id = lastminute_provider_id
      WHERE id IN (
        SELECT id
        FROM public.experience
        WHERE active = true AND provider_id != lastminute_provider_id
        ORDER BY created_at DESC
        LIMIT remaining_count
      );
      
      GET DIAGNOSTICS remaining_count = ROW_COUNT;
      product_count := product_count + remaining_count;
      RAISE NOTICE 'Aggiunte altre % experiences per raggiungere 10 prodotti', remaining_count;
    END IF;
    
    -- Prova con più classes se disponibili
    remaining_count := 10 - product_count;
    IF class_count > 3 AND remaining_count > 0 THEN
      UPDATE public.class
      SET provider_id = lastminute_provider_id
      WHERE id IN (
        SELECT id
        FROM public.class
        WHERE active = true AND provider_id != lastminute_provider_id
        ORDER BY created_at DESC
        LIMIT remaining_count
      );
      
      GET DIAGNOSTICS remaining_count = ROW_COUNT;
      product_count := product_count + remaining_count;
      RAISE NOTICE 'Aggiunte altre % classes per raggiungere 10 prodotti', remaining_count;
    END IF;
    
    -- Prova con più trips se disponibili
    remaining_count := 10 - product_count;
    IF trip_count > 3 AND remaining_count > 0 THEN
      UPDATE public.trip
      SET provider_id = lastminute_provider_id
      WHERE id IN (
        SELECT id
        FROM public.trip
        WHERE active = true AND provider_id != lastminute_provider_id
        ORDER BY created_at DESC
        LIMIT remaining_count
      );
      
      GET DIAGNOSTICS remaining_count = ROW_COUNT;
      product_count := product_count + remaining_count;
      RAISE NOTICE 'Aggiunte altre % trips per raggiungere 10 prodotti', remaining_count;
    END IF;
  END IF;
  
  RAISE NOTICE 'Totale prodotti associati al provider lastminute.com: %', product_count;
END $$;



