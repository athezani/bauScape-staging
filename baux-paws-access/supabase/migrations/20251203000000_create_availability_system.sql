-- ============================================
-- AVAILABILITY SYSTEM - Complete Implementation
-- ============================================

-- Step 1: Add 'active' field to product tables
ALTER TABLE IF EXISTS public.experience ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.class ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.trip ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Add cutoff_hours to product tables (global per prodotto)
ALTER TABLE IF EXISTS public.experience ADD COLUMN IF NOT EXISTS cutoff_hours INTEGER DEFAULT NULL CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0);
ALTER TABLE IF EXISTS public.class ADD COLUMN IF NOT EXISTS cutoff_hours INTEGER DEFAULT NULL CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0);
ALTER TABLE IF EXISTS public.trip ADD COLUMN IF NOT EXISTS cutoff_hours INTEGER DEFAULT NULL CHECK (cutoff_hours IS NULL OR cutoff_hours >= 0);

-- Step 3: Add full_day time fields to product tables (for when no time slots are defined)
ALTER TABLE IF EXISTS public.experience ADD COLUMN IF NOT EXISTS full_day_start_time TIME DEFAULT NULL;
ALTER TABLE IF EXISTS public.experience ADD COLUMN IF NOT EXISTS full_day_end_time TIME DEFAULT NULL;
ALTER TABLE IF EXISTS public.class ADD COLUMN IF NOT EXISTS full_day_start_time TIME DEFAULT NULL;
ALTER TABLE IF EXISTS public.class ADD COLUMN IF NOT EXISTS full_day_end_time TIME DEFAULT NULL;

-- Step 4: Create availability_slot table
CREATE TABLE IF NOT EXISTS public.availability_slot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('experience', 'class', 'trip')),
  date DATE NOT NULL,
  time_slot TIME DEFAULT NULL, -- NULL per full-day o trips
  end_time TIME DEFAULT NULL, -- Calcolato se non specificato (start_time + duration_hours)
  max_adults INTEGER NOT NULL DEFAULT 999 CHECK (max_adults > 0),
  max_dogs INTEGER NOT NULL DEFAULT 999 CHECK (max_dogs >= 0),
  booked_adults INTEGER NOT NULL DEFAULT 0 CHECK (booked_adults >= 0),
  booked_dogs INTEGER NOT NULL DEFAULT 0 CHECK (booked_dogs >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  -- Per trips, time_slot deve essere NULL
  CONSTRAINT availability_slot_trip_no_time CHECK (
    product_type != 'trip' OR time_slot IS NULL
  ),
  -- booked non può superare max
  CONSTRAINT availability_slot_capacity_check CHECK (
    booked_adults <= max_adults AND booked_dogs <= max_dogs
  ),
  -- Date non può essere nel passato (validazione a livello applicativo, ma anche DB per sicurezza)
  CONSTRAINT availability_slot_future_date CHECK (
    date >= CURRENT_DATE
  )
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS availability_slot_product_idx ON public.availability_slot (product_id, product_type);
CREATE INDEX IF NOT EXISTS availability_slot_date_idx ON public.availability_slot (date);
CREATE INDEX IF NOT EXISTS availability_slot_product_date_idx ON public.availability_slot (product_id, product_type, date);
CREATE INDEX IF NOT EXISTS availability_slot_available_idx ON public.availability_slot (product_id, product_type, date, time_slot) 
  WHERE booked_adults < max_adults AND booked_dogs < max_dogs;

-- Step 6: Enable RLS
ALTER TABLE public.availability_slot ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies
-- Public can view available slots (for e-commerce)
CREATE POLICY "Public can view availability slots"
ON public.availability_slot
FOR SELECT
TO anon, authenticated
USING (
  -- Solo prodotti attivi
  (product_type = 'experience' AND product_id IN (SELECT id FROM public.experience WHERE active = true)) OR
  (product_type = 'class' AND product_id IN (SELECT id FROM public.class WHERE active = true)) OR
  (product_type = 'trip' AND product_id IN (SELECT id FROM public.trip WHERE active = true))
);

-- Admins can manage all availability slots
CREATE POLICY "Admins can manage availability slots"
ON public.availability_slot
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Step 8: Add availability_slot_id to booking table
-- Verifica se la tabella si chiama 'booking' o 'bookings' e aggiungi i campi
DO $$
BEGIN
  -- Prova con 'booking' (singolare)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
    ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS availability_slot_id UUID REFERENCES public.availability_slot(id) ON DELETE SET NULL;
    ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS trip_start_date DATE DEFAULT NULL;
    ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS trip_end_date DATE DEFAULT NULL;
  -- Fallback su 'bookings' (plurale) se esiste
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS availability_slot_id UUID REFERENCES public.availability_slot(id) ON DELETE SET NULL;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_start_date DATE DEFAULT NULL;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_end_date DATE DEFAULT NULL;
  END IF;
END $$;

-- Step 9: Create index for booking availability lookup
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
    CREATE INDEX IF NOT EXISTS booking_availability_slot_idx ON public.booking (availability_slot_id);
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    CREATE INDEX IF NOT EXISTS bookings_availability_slot_idx ON public.bookings (availability_slot_id);
  END IF;
END $$;

-- Step 10: Create trigger to update booked counters when booking is created
CREATE OR REPLACE FUNCTION public.update_availability_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  num_adults INTEGER := 0;
BEGIN
  -- Incrementa booked_adults e booked_dogs quando viene creato un booking
  -- Supporta sia 'number_of_adults'/'number_of_dogs' che 'number_of_humans'/'number_of_dogs'
  IF NEW.availability_slot_id IS NOT NULL THEN
    -- Determina il numero di adulti/persone in base alle colonne disponibili
    BEGIN
      -- Prova prima con number_of_humans (provider portal)
      num_adults := NEW.number_of_humans;
    EXCEPTION
      WHEN undefined_column THEN
        BEGIN
          -- Se non esiste, prova con number_of_adults (ecommerce)
          num_adults := NEW.number_of_adults;
        EXCEPTION
          WHEN undefined_column THEN
            num_adults := 0;
        END;
    END;
    
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

-- Crea trigger per 'booking' (singolare)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
    DROP TRIGGER IF EXISTS booking_created_update_availability ON public.booking;
    CREATE TRIGGER booking_created_update_availability
    AFTER INSERT ON public.booking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_availability_on_booking();
  END IF;
  
  -- Fallback per 'bookings' (plurale)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DROP TRIGGER IF EXISTS bookings_created_update_availability ON public.bookings;
    CREATE TRIGGER bookings_created_update_availability
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_availability_on_booking();
  END IF;
END $$;

-- Step 11: Create trigger to update booked counters when booking is cancelled/deleted
CREATE OR REPLACE FUNCTION public.update_availability_on_booking_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decrementa booked_adults e booked_dogs quando un booking viene cancellato o eliminato
  -- Supporta sia 'number_of_adults'/'number_of_dogs' che 'number_of_humans'/'number_of_dogs'
  IF OLD.availability_slot_id IS NOT NULL AND 
     (OLD.status != 'cancelled' AND (NEW.status = 'cancelled' OR NEW IS NULL)) THEN
    UPDATE public.availability_slot
    SET 
      booked_adults = GREATEST(0, booked_adults - COALESCE(
        OLD.number_of_adults, 
        OLD.number_of_humans, 
        0
      )),
      booked_dogs = GREATEST(0, booked_dogs - COALESCE(OLD.number_of_dogs, 0)),
      updated_at = NOW()
    WHERE id = OLD.availability_slot_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crea trigger per 'booking' (singolare)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
    DROP TRIGGER IF EXISTS booking_cancelled_update_availability ON public.booking;
    DROP TRIGGER IF EXISTS booking_deleted_update_availability ON public.booking;
    
    CREATE TRIGGER booking_cancelled_update_availability
    AFTER UPDATE OF status ON public.booking
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.update_availability_on_booking_cancel();
    
    CREATE TRIGGER booking_deleted_update_availability
    AFTER DELETE ON public.booking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_availability_on_booking_cancel();
  END IF;
  
  -- Fallback per 'bookings' (plurale)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DROP TRIGGER IF EXISTS bookings_cancelled_update_availability ON public.bookings;
    DROP TRIGGER IF EXISTS bookings_deleted_update_availability ON public.bookings;
    
    CREATE TRIGGER bookings_cancelled_update_availability
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.update_availability_on_booking_cancel();
    
    CREATE TRIGGER bookings_deleted_update_availability
    AFTER DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_availability_on_booking_cancel();
  END IF;
END $$;

-- Step 12: Create function to check if slot is available (considering cutoff time)
CREATE OR REPLACE FUNCTION public.is_slot_available(
  _product_id UUID,
  _product_type TEXT,
  _date DATE,
  _time_slot TIME DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _slot RECORD;
  _cutoff_hours INTEGER;
  _slot_datetime TIMESTAMPTZ;
  _cutoff_datetime TIMESTAMPTZ;
BEGIN
  -- Trova lo slot
  SELECT * INTO _slot
  FROM public.availability_slot
  WHERE product_id = _product_id
    AND product_type = _product_type
    AND date = _date
    AND (
      (_time_slot IS NULL AND time_slot IS NULL) OR
      (_time_slot IS NOT NULL AND time_slot = _time_slot::TIME)
    );
  
  IF _slot IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica capacità
  IF _slot.booked_adults >= _slot.max_adults OR _slot.booked_dogs >= _slot.max_dogs THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica cutoff time
  SELECT cutoff_hours INTO _cutoff_hours
  FROM (
    SELECT cutoff_hours FROM public.experience WHERE id = _product_id AND _product_type = 'experience'
    UNION ALL
    SELECT cutoff_hours FROM public.class WHERE id = _product_id AND _product_type = 'class'
    UNION ALL
    SELECT cutoff_hours FROM public.trip WHERE id = _product_id AND _product_type = 'trip'
  ) AS product_cutoff
  LIMIT 1;
  
  IF _cutoff_hours IS NOT NULL AND _cutoff_hours > 0 THEN
    -- Calcola datetime dello slot
    _slot_datetime := (_date::TIMESTAMPTZ + COALESCE(_time_slot, '00:00:00'::TIME)::INTERVAL);
    _cutoff_datetime := NOW() + (_cutoff_hours || ' hours')::INTERVAL;
    
    IF _slot_datetime <= _cutoff_datetime THEN
      RETURN FALSE; -- Troppo tardi per prenotare
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Step 13: Create updated_at trigger for availability_slot
CREATE TRIGGER availability_slot_set_updated_at
BEFORE UPDATE ON public.availability_slot
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Step 14: Add comments for documentation
COMMENT ON TABLE public.availability_slot IS 'Stores availability slots for products. For trips, only start date is stored.';
COMMENT ON COLUMN public.availability_slot.time_slot IS 'Time slot start time. NULL for full-day sessions or trips.';
COMMENT ON COLUMN public.availability_slot.end_time IS 'Time slot end time. Calculated from start_time + duration_hours if not specified.';
COMMENT ON COLUMN public.availability_slot.booked_adults IS 'Number of adults currently booked for this slot';
COMMENT ON COLUMN public.availability_slot.booked_dogs IS 'Number of dogs currently booked for this slot';
COMMENT ON COLUMN public.booking.availability_slot_id IS 'Reference to the availability slot that was booked';
COMMENT ON COLUMN public.booking.trip_start_date IS 'Start date for trips (stored for reference)';
COMMENT ON COLUMN public.booking.trip_end_date IS 'End date for trips (stored for reference)';

