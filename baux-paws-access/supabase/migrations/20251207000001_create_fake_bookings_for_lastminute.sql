-- ============================================
-- Create 10 fake bookings for lastminute.com provider
-- ============================================
-- This migration creates 10 realistic fake bookings associated with
-- products from the lastminute.com provider

DO $$
DECLARE
  lastminute_provider_id UUID;
  product_record RECORD;
  slot_record RECORD;
  booking_counter INTEGER := 0;
  customer_names TEXT[] := ARRAY[
    'Mario', 'Luigi', 'Giulia', 'Francesca', 'Marco', 
    'Sara', 'Andrea', 'Chiara', 'Luca', 'Elena'
  ];
  customer_surnames TEXT[] := ARRAY[
    'Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Romano',
    'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno'
  ];
  customer_emails TEXT[] := ARRAY[
    'mario.rossi@example.com', 'luigi.bianchi@example.com', 'giulia.ferrari@example.com',
    'francesca.russo@example.com', 'marco.romano@example.com', 'sara.colombo@example.com',
    'andrea.ricci@example.com', 'chiara.marino@example.com', 'luca.greco@example.com',
    'elena.bruno@example.com'
  ];
  customer_phones TEXT[] := ARRAY[
    '+39 340 123 4567', '+39 333 234 5678', '+39 320 345 6789',
    '+39 366 456 7890', '+39 347 567 8901', '+39 328 678 9012',
    '+39 339 789 0123', '+39 335 890 1234', '+39 331 901 2345',
    '+39 338 012 3456'
  ];
  booking_statuses TEXT[] := ARRAY['confirmed', 'confirmed', 'confirmed', 'pending', 'completed'];
  random_status TEXT;
  random_date DATE;
  random_time TIME;
  booking_date DATE;
  booking_time TIME;
  num_adults INTEGER;
  num_dogs INTEGER;
  total_amount NUMERIC(10,2);
  session_id TEXT;
  payment_intent_id TEXT;
  i INTEGER;
  customer_idx INTEGER;
BEGIN
  -- Step 1: Trova il provider "lastminute.com"
  SELECT id INTO lastminute_provider_id
  FROM public.profile
  WHERE LOWER(company_name) LIKE '%lastminute%' OR LOWER(company_name) LIKE '%last minute%'
  LIMIT 1;
  
  IF lastminute_provider_id IS NULL THEN
    RAISE NOTICE 'Provider lastminute.com non trovato. Esegui prima la migrazione per associare i prodotti.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Provider trovato: lastminute.com (ID: %)', lastminute_provider_id;
  
  -- Step 2: Crea 10 booking finti
  -- Prendi prodotti associati al provider lastminute.com
  -- Nota: l'enum product_type include solo 'experience' e 'trip', quindi le classi vengono trattate come experiences
  FOR product_record IN 
    (
      SELECT 'experience'::text as product_type, id, name, description, provider_id, 
             price_adult_base as price_adult, price_dog_base as price_dog
      FROM public.experience
      WHERE provider_id = lastminute_provider_id AND active = true
      LIMIT 5
    )
    UNION ALL
    (
      SELECT 'experience'::text as product_type, id, name, description, provider_id,
             price_adult_base as price_adult, price_dog_base as price_dog
      FROM public.class
      WHERE provider_id = lastminute_provider_id AND active = true
      LIMIT 3
    )
    UNION ALL
    (
      SELECT 'trip'::text as product_type, id, name, description, provider_id,
             price_adult_base as price_adult, price_dog_base as price_dog
      FROM public.trip
      WHERE provider_id = lastminute_provider_id AND active = true
      LIMIT 2
    )
    LIMIT 10
  LOOP
    -- Trova un availability_slot per questo prodotto
    SELECT id, date, time_slot INTO slot_record
    FROM public.availability_slot
    WHERE product_id = product_record.id 
      AND product_type = product_record.product_type
      AND date >= CURRENT_DATE
      AND (max_adults - booked_adults) >= 2  -- Assicura che ci sia spazio
    ORDER BY date ASC
    LIMIT 1;
    
    -- Se non c'è uno slot disponibile, crea una data futura
    IF slot_record.id IS NULL THEN
      booking_date := CURRENT_DATE + (30 + floor(random() * 60))::INTEGER;
      booking_time := CASE 
        WHEN product_record.product_type IN ('experience', 'class') THEN
          (ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])[
            1 + floor(random() * 7)::INTEGER
          ]::TIME
        ELSE NULL
      END;
    ELSE
      booking_date := slot_record.date;
      booking_time := slot_record.time_slot;
    END IF;
    
    -- Genera dati casuali per il booking
    customer_idx := 1 + floor(random() * array_length(customer_names, 1))::INTEGER;
    num_adults := 1 + floor(random() * 3)::INTEGER;  -- 1-3 adulti
    num_dogs := floor(random() * 3)::INTEGER;  -- 0-2 cani
    
    -- Calcola il totale
    total_amount := COALESCE(product_record.price_adult, 0) * num_adults + 
                    COALESCE(product_record.price_dog, 0) * num_dogs;
    
    -- Genera ID finti per Stripe
    session_id := 'cs_test_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    payment_intent_id := 'pi_test_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    
    -- Scegli uno status casuale (prevalentemente confirmed)
    random_status := booking_statuses[1 + floor(random() * array_length(booking_statuses, 1))::INTEGER];
    
    -- Inserisci il booking
    INSERT INTO public.booking (
      product_type,
      provider_id,
      availability_slot_id,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      status,
      booking_date,
      booking_time,
      number_of_adults,
      number_of_dogs,
      total_amount_paid,
      currency,
      customer_email,
      customer_name,
      customer_surname,
      customer_phone,
      product_name,
      product_description,
      created_at
    ) VALUES (
      product_record.product_type::public.product_type,
      lastminute_provider_id,
      slot_record.id,
      session_id,
      payment_intent_id,
      random_status,
      booking_date,
      booking_time,
      num_adults,
      num_dogs,
      total_amount,
      'EUR',
      customer_emails[customer_idx],
      customer_names[customer_idx],
      customer_surnames[customer_idx],
      customer_phones[customer_idx],
      product_record.name,
      product_record.description,
      NOW() - (floor(random() * 30) || ' days')::INTERVAL  -- Booking creati negli ultimi 30 giorni
    );
    
    booking_counter := booking_counter + 1;
    RAISE NOTICE 'Booking % creato: % - % (% adulti, % cani) - Status: %', 
      booking_counter, 
      customer_names[customer_idx] || ' ' || customer_surnames[customer_idx],
      product_record.name,
      num_adults,
      num_dogs,
      random_status;
  END LOOP;
  
  RAISE NOTICE 'Totale booking creati: %', booking_counter;
END $$;

