-- ============================================
-- Add Example FAQs
-- ============================================
-- This migration adds example FAQs inspired by the "Regolamento a 6 zampe"
-- and associates them with existing products
-- ============================================

-- Insert example FAQs
INSERT INTO public.faq (id, question, answer) VALUES
  (
    gen_random_uuid(),
    'Quali documenti servono per partecipare?',
    'È necessario portare il libretto sanitario del cane aggiornato con le vaccinazioni obbligatorie (antirabbica e polivalente). Per i viaggi di più giorni, potrebbe essere richiesto anche il passaporto europeo per animali da compagnia. Ti consigliamo di verificare i requisiti specifici nella descrizione del prodotto.'
  ),
  (
    gen_random_uuid(),
    'Il mio cane può partecipare se non è sterilizzato?',
    'Sì, i cani non sterilizzati possono partecipare alle nostre esperienze. Tuttavia, per garantire il benessere di tutti i partecipanti, chiediamo che i cani in calore non partecipino alle attività di gruppo. In caso di dubbio, contattaci prima della prenotazione.'
  ),
  (
    gen_random_uuid(),
    'Cosa succede in caso di maltempo?',
    'Le nostre esperienze si svolgono principalmente all''aperto e sono progettate per essere svolte anche con condizioni meteorologiche moderate. In caso di condizioni meteo estreme o pericolose, l''attività potrebbe essere posticipata o annullata. Ti contatteremo con almeno 24 ore di anticipo per comunicarti eventuali cambiamenti.'
  ),
  (
    gen_random_uuid(),
    'Posso portare più di un cane?',
    'Sì, puoi portare più cani, ma il numero massimo dipende dal tipo di esperienza e dalla disponibilità. Durante la prenotazione, potrai selezionare il numero di cani che desideri portare. Ti ricordiamo che ogni cane deve essere gestito da almeno una persona adulta responsabile.'
  ),
  (
    gen_random_uuid(),
    'Cosa devo portare per il mio cane?',
    'Ti consigliamo di portare: guinzaglio (obbligatorio), pettorina o collare, ciotola per l''acqua, sacchetti per la raccolta delle deiezioni, eventuali snack o cibo se l''esperienza si protrae oltre le 2-3 ore, e un asciugamano se l''attività prevede contatto con l''acqua. Per i viaggi di più giorni, consulta la lista completa nella descrizione del prodotto.'
  ),
  (
    gen_random_uuid(),
    'Cosa succede se devo cancellare la prenotazione?',
    'La policy di cancellazione varia in base al tipo di prodotto e alla data della prenotazione. Consulta la sezione "Policy di Cancellazione" nella pagina del prodotto per i dettagli specifici. In generale, le cancellazioni effettuate con almeno 7 giorni di anticipo sono solitamente gratuite.'
  ),
  (
    gen_random_uuid(),
    'Il trasporto è incluso?',
    'Il trasporto non è incluso nel prezzo base delle esperienze e delle classi. Per i viaggi, il trasporto potrebbe essere incluso o organizzato separatamente - consulta la descrizione del prodotto per i dettagli. Ti consigliamo di verificare il punto di incontro indicato nella prenotazione.'
  ),
  (
    gen_random_uuid(),
    'Posso partecipare se non ho un cane?',
    'Le nostre esperienze sono progettate per persone con cani. Se non hai un cane ma sei interessato a partecipare, contattaci - potremmo organizzare esperienze speciali o permetterti di partecipare come osservatore in alcune attività. Tuttavia, la maggior parte delle esperienze richiede la presenza di almeno un cane per partecipante.'
  )
ON CONFLICT DO NOTHING;

-- Associate FAQs to existing products (if any exist)
-- This will associate the first 3 FAQs to the first product of each type
DO $$
DECLARE
  exp_id UUID;
  class_id UUID;
  trip_id UUID;
  faq_ids UUID[];
BEGIN
  -- Get FAQ IDs (first 3)
  SELECT ARRAY_AGG(id) INTO faq_ids
  FROM public.faq
  ORDER BY created_at DESC
  LIMIT 3;

  -- Associate with first experience (if exists)
  SELECT id INTO exp_id
  FROM public.experience
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF exp_id IS NOT NULL AND faq_ids IS NOT NULL THEN
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    SELECT exp_id, 'experience', unnest(faq_ids), generate_series(0, array_length(faq_ids, 1) - 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Associate with first class (if exists)
  SELECT id INTO class_id
  FROM public.class
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF class_id IS NOT NULL AND faq_ids IS NOT NULL THEN
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    SELECT class_id, 'class', unnest(faq_ids), generate_series(0, array_length(faq_ids, 1) - 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Associate with first trip (if exists)
  SELECT id INTO trip_id
  FROM public.trip
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF trip_id IS NOT NULL AND faq_ids IS NOT NULL THEN
    INSERT INTO public.product_faq (product_id, product_type, faq_id, order_index)
    SELECT trip_id, 'trip', unnest(faq_ids), generate_series(0, array_length(faq_ids, 1) - 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: example FAQs added successfully!';
END $$;

