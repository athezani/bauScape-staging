-- Fix: Aggiunge tracking email per garantire invio sempre
-- Aggiunge colonna per tracciare se l'email di conferma è stata inviata

-- Aggiungi colonna se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking' 
    AND column_name = 'confirmation_email_sent'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN confirmation_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
    
    -- Crea indice per query veloci
    CREATE INDEX IF NOT EXISTS idx_booking_confirmation_email_sent 
    ON public.booking(confirmation_email_sent) 
    WHERE confirmation_email_sent = FALSE;
    
    RAISE NOTICE '✅ Colonna confirmation_email_sent aggiunta';
  ELSE
    RAISE NOTICE '⚠️  Colonna confirmation_email_sent già esiste';
  END IF;
END $$;

-- Aggiorna booking esistenti (assumiamo che siano già stati inviati)
UPDATE public.booking 
SET confirmation_email_sent = TRUE 
WHERE confirmation_email_sent = FALSE 
AND status = 'confirmed'
AND created_at < NOW() - INTERVAL '1 hour';  -- Solo booking vecchi

COMMENT ON COLUMN public.booking.confirmation_email_sent IS 
  'Indica se l''email di conferma è stata inviata con successo. Usato per garantire invio email anche in caso di fallimenti.';




