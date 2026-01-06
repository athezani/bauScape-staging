-- ============================================
-- FIX: Corregge i trigger per gestire correttamente number_of_humans vs number_of_adults
-- ============================================

-- Step 1: Aggiorna funzione per creazione booking
CREATE OR REPLACE FUNCTION public.update_availability_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  num_adults INTEGER := 0;
BEGIN
  -- Incrementa booked_adults e booked_dogs quando viene creato un booking
  IF NEW.availability_slot_id IS NOT NULL THEN
    -- Verifica quale colonna esiste nella tabella booking
    -- Prova prima con number_of_humans (provider portal)
    BEGIN
      -- Usa una query dinamica per verificare quale colonna esiste
      EXECUTE format('SELECT $1.%I', 'number_of_humans') USING NEW INTO num_adults;
    EXCEPTION
      WHEN OTHERS THEN
        BEGIN
          -- Se number_of_humans non esiste, prova con number_of_adults (ecommerce)
          EXECUTE format('SELECT $1.%I', 'number_of_adults') USING NEW INTO num_adults;
        EXCEPTION
          WHEN OTHERS THEN
            num_adults := 0;
        END;
    END;
    
    -- Usa un approccio più semplice: verifica direttamente quale colonna esiste
    -- Per il provider portal, usa sempre number_of_humans
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'number_of_humans'
    ) THEN
      num_adults := NEW.number_of_humans;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'number_of_adults'
    ) THEN
      num_adults := NEW.number_of_adults;
    ELSE
      num_adults := 0;
    END IF;
    
    UPDATE public.availability_slot
    SET 
      booked_adults = booked_adults + COALESCE(num_adults, 0),
      booked_dogs = booked_dogs + COALESCE(NEW.number_of_dogs, 0),
      updated_at = NOW()
    WHERE id = NEW.availability_slot_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Aggiorna funzione per cancellazione booking
CREATE OR REPLACE FUNCTION public.update_availability_on_booking_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  num_adults INTEGER := 0;
BEGIN
  -- Decrementa booked_adults e booked_dogs quando un booking viene cancellato o eliminato
  IF OLD.availability_slot_id IS NOT NULL AND 
     (OLD.status != 'cancelled' AND (NEW.status = 'cancelled' OR NEW IS NULL)) THEN
    -- Verifica quale colonna esiste nella tabella booking
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'number_of_humans'
    ) THEN
      num_adults := OLD.number_of_humans;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'number_of_adults'
    ) THEN
      num_adults := OLD.number_of_adults;
    ELSE
      num_adults := 0;
    END IF;
    
    UPDATE public.availability_slot
    SET 
      booked_adults = GREATEST(0, booked_adults - COALESCE(num_adults, 0)),
      booked_dogs = GREATEST(0, booked_dogs - COALESCE(OLD.number_of_dogs, 0)),
      updated_at = NOW()
    WHERE id = OLD.availability_slot_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;



