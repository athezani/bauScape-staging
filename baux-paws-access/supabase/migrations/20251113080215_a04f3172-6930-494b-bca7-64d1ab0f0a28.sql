-- Transfer values from price_per_person to price_adult_base (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trip' AND column_name = 'price_per_person'
  ) THEN
    UPDATE trip
    SET price_adult_base = price_per_person
    WHERE price_per_person IS NOT NULL AND price_adult_base IS NULL;
  END IF;
END $$;;

-- Drop the price_per_person column (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trip' AND column_name = 'price_per_person'
  ) THEN
    ALTER TABLE trip DROP COLUMN price_per_person;
  END IF;
END $$;