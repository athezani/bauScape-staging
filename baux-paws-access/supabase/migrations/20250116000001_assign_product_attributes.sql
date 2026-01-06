-- ============================================
-- Assign product attributes based on content matching
-- ============================================
-- This migration analyzes existing products and assigns attributes
-- based on keywords found in name, description, location, and meeting_point
-- ============================================

DO $$
DECLARE
  product_record RECORD;
  matched_attributes TEXT[];
  search_text TEXT;
  attr_key TEXT;
BEGIN
  RAISE NOTICE 'Starting attribute assignment for existing products...';

  -- Process EXPERIENCE products
  FOR product_record IN 
    SELECT id, name, description, meeting_point
    FROM public.experience
    WHERE attributes IS NULL OR jsonb_array_length(COALESCE(attributes, '[]'::jsonb)) = 0
  LOOP
    matched_attributes := ARRAY[]::TEXT[];
    search_text := LOWER(COALESCE(product_record.name, '') || ' ' || 
                         COALESCE(product_record.description, '') || ' ' || 
                         COALESCE(product_record.meeting_point, ''));

    -- Check for mountain keywords
    IF search_text ~* '(montagna|monti|alp|dolomiti|appennini|vetta|cima|escursione.*mont|trekking.*mont|hiking.*mont)' THEN
      matched_attributes := array_append(matched_attributes, 'mountain');
    END IF;

    -- Check for lake keywords
    IF search_text ~* '(lago|laghi|lacustre|riva.*lago|spiaggia.*lago)' THEN
      matched_attributes := array_append(matched_attributes, 'lake');
    END IF;

    -- Check for sea keywords
    IF search_text ~* '(mare|marino|spiaggia|costiera|litorale|baia|golfo|riviera|beach|coast)' THEN
      matched_attributes := array_append(matched_attributes, 'sea');
    END IF;

    -- Check for park keywords
    IF search_text ~* '(parco|parchi|giardino|verde|natura|bosco|foresta|naturalistico)' THEN
      matched_attributes := array_append(matched_attributes, 'park');
    END IF;

    -- Check for city keywords
    IF search_text ~* '(città|urbano|centro.*storico|metropoli|metropolitan|urban|city|centro.*città)' THEN
      matched_attributes := array_append(matched_attributes, 'city');
    END IF;

    -- Update product with matched attributes (or NULL if no matches)
    IF array_length(matched_attributes, 1) > 0 THEN
      UPDATE public.experience
      SET attributes = to_jsonb(matched_attributes)
      WHERE id = product_record.id;
      RAISE NOTICE 'Experience % (%) assigned attributes: %', product_record.id, product_record.name, matched_attributes;
    ELSE
      RAISE NOTICE 'Experience % (%) - no attributes matched', product_record.id, product_record.name;
    END IF;
  END LOOP;

  -- Process CLASS products
  FOR product_record IN 
    SELECT id, name, description, meeting_point
    FROM public.class
    WHERE attributes IS NULL OR jsonb_array_length(COALESCE(attributes, '[]'::jsonb)) = 0
  LOOP
    matched_attributes := ARRAY[]::TEXT[];
    search_text := LOWER(COALESCE(product_record.name, '') || ' ' || 
                         COALESCE(product_record.description, '') || ' ' || 
                         COALESCE(product_record.meeting_point, ''));

    -- Check for mountain keywords
    IF search_text ~* '(montagna|monti|alp|dolomiti|appennini|vetta|cima|escursione.*mont|trekking.*mont|hiking.*mont)' THEN
      matched_attributes := array_append(matched_attributes, 'mountain');
    END IF;

    -- Check for lake keywords
    IF search_text ~* '(lago|laghi|lacustre|riva.*lago|spiaggia.*lago)' THEN
      matched_attributes := array_append(matched_attributes, 'lake');
    END IF;

    -- Check for sea keywords
    IF search_text ~* '(mare|marino|spiaggia|costiera|litorale|baia|golfo|riviera|beach|coast)' THEN
      matched_attributes := array_append(matched_attributes, 'sea');
    END IF;

    -- Check for park keywords
    IF search_text ~* '(parco|parchi|giardino|verde|natura|bosco|foresta|naturalistico)' THEN
      matched_attributes := array_append(matched_attributes, 'park');
    END IF;

    -- Check for city keywords
    IF search_text ~* '(città|urbano|centro.*storico|metropoli|metropolitan|urban|city|centro.*città)' THEN
      matched_attributes := array_append(matched_attributes, 'city');
    END IF;

    -- Update product with matched attributes (or NULL if no matches)
    IF array_length(matched_attributes, 1) > 0 THEN
      UPDATE public.class
      SET attributes = to_jsonb(matched_attributes)
      WHERE id = product_record.id;
      RAISE NOTICE 'Class % (%) assigned attributes: %', product_record.id, product_record.name, matched_attributes;
    ELSE
      RAISE NOTICE 'Class % (%) - no attributes matched', product_record.id, product_record.name;
    END IF;
  END LOOP;

  -- Process TRIP products
  FOR product_record IN 
    SELECT id, name, description, location
    FROM public.trip
    WHERE attributes IS NULL OR jsonb_array_length(COALESCE(attributes, '[]'::jsonb)) = 0
  LOOP
    matched_attributes := ARRAY[]::TEXT[];
    search_text := LOWER(COALESCE(product_record.name, '') || ' ' || 
                         COALESCE(product_record.description, '') || ' ' || 
                         COALESCE(product_record.location, ''));

    -- Check for mountain keywords
    IF search_text ~* '(montagna|monti|alp|dolomiti|appennini|vetta|cima|escursione.*mont|trekking.*mont|hiking.*mont)' THEN
      matched_attributes := array_append(matched_attributes, 'mountain');
    END IF;

    -- Check for lake keywords
    IF search_text ~* '(lago|laghi|lacustre|riva.*lago|spiaggia.*lago)' THEN
      matched_attributes := array_append(matched_attributes, 'lake');
    END IF;

    -- Check for sea keywords
    IF search_text ~* '(mare|marino|spiaggia|costiera|litorale|baia|golfo|riviera|beach|coast)' THEN
      matched_attributes := array_append(matched_attributes, 'sea');
    END IF;

    -- Check for park keywords
    IF search_text ~* '(parco|parchi|giardino|verde|natura|bosco|foresta|naturalistico)' THEN
      matched_attributes := array_append(matched_attributes, 'park');
    END IF;

    -- Check for city keywords
    IF search_text ~* '(città|urbano|centro.*storico|metropoli|metropolitan|urban|city|centro.*città)' THEN
      matched_attributes := array_append(matched_attributes, 'city');
    END IF;

    -- Update product with matched attributes (or NULL if no matches)
    IF array_length(matched_attributes, 1) > 0 THEN
      UPDATE public.trip
      SET attributes = to_jsonb(matched_attributes)
      WHERE id = product_record.id;
      RAISE NOTICE 'Trip % (%) assigned attributes: %', product_record.id, product_record.name, matched_attributes;
    ELSE
      RAISE NOTICE 'Trip % (%) - no attributes matched', product_record.id, product_record.name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Attribute assignment completed!';
END $$;

