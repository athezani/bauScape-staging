-- ============================================
-- Auto-calculation of duration_hours from availability slots
-- ============================================
-- This migration:
-- 1. Creates a function to calculate duration_hours from availability slots
-- 2. Creates triggers to auto-update duration_hours when slots change
-- 3. Makes duration_hours nullable (it will be calculated automatically)
-- ============================================

-- Step 1: Make duration_hours nullable (it will be calculated automatically)
ALTER TABLE IF EXISTS public.experience ALTER COLUMN duration_hours DROP NOT NULL;
ALTER TABLE IF EXISTS public.class ALTER COLUMN duration_hours DROP NOT NULL;

-- Step 2: Create function to calculate duration from slots
CREATE OR REPLACE FUNCTION public.calculate_product_duration(
  p_product_id UUID,
  p_product_type TEXT
) RETURNS NUMERIC AS $$
DECLARE
  calculated_duration NUMERIC;
  slot_record RECORD;
  total_duration NUMERIC := 0;
  slot_count INTEGER := 0;
  avg_duration NUMERIC;
BEGIN
  -- Calculate duration from availability slots with time_slot and end_time
  FOR slot_record IN
    SELECT time_slot, end_time
    FROM public.availability_slot
    WHERE product_id = p_product_id
      AND product_type = p_product_type
      AND time_slot IS NOT NULL
      AND end_time IS NOT NULL
    LIMIT 100  -- Limit to avoid performance issues
  LOOP
    -- Calculate duration in hours (handling day overflow)
    IF slot_record.end_time >= slot_record.time_slot THEN
      -- Same day
      calculated_duration := EXTRACT(EPOCH FROM (slot_record.end_time - slot_record.time_slot)) / 3600.0;
    ELSE
      -- Next day (e.g., 23:00 to 01:00 = 2 hours)
      calculated_duration := EXTRACT(EPOCH FROM (slot_record.end_time + INTERVAL '1 day' - slot_record.time_slot)) / 3600.0;
    END IF;
    
    -- Only count valid durations (positive and > 0)
    IF calculated_duration IS NOT NULL AND calculated_duration > 0 THEN
      total_duration := total_duration + calculated_duration;
      slot_count := slot_count + 1;
    END IF;
  END LOOP;
  
  -- If we have slots, return average duration
  IF slot_count > 0 THEN
    avg_duration := total_duration / slot_count;
    -- Round to 1 decimal place and ensure it's positive
    avg_duration := ROUND(avg_duration * 10) / 10;
    -- Validate: must be > 0 to satisfy constraint
    IF avg_duration > 0 THEN
      RETURN avg_duration;
    END IF;
  END IF;
  
  -- If no slots with time, check for full_day_start_time and full_day_end_time
  IF p_product_type = 'experience' THEN
    SELECT 
      EXTRACT(EPOCH FROM (full_day_end_time - full_day_start_time)) / 3600.0
    INTO calculated_duration
    FROM public.experience
    WHERE id = p_product_id
      AND full_day_start_time IS NOT NULL
      AND full_day_end_time IS NOT NULL;
      
    -- Handle case where end_time < start_time (next day)
    IF calculated_duration IS NOT NULL THEN
      IF calculated_duration <= 0 THEN
        -- If negative or zero, assume next day
        calculated_duration := EXTRACT(EPOCH FROM (calculated_duration + INTERVAL '1 day')) / 3600.0;
      END IF;
      IF calculated_duration > 0 THEN
        RETURN ROUND(calculated_duration * 10) / 10;
      END IF;
    END IF;
  ELSIF p_product_type = 'class' THEN
    SELECT 
      EXTRACT(EPOCH FROM (full_day_end_time - full_day_start_time)) / 3600.0
    INTO calculated_duration
    FROM public.class
    WHERE id = p_product_id
      AND full_day_start_time IS NOT NULL
      AND full_day_end_time IS NOT NULL;
      
    -- Handle case where end_time < start_time (next day)
    IF calculated_duration IS NOT NULL THEN
      IF calculated_duration <= 0 THEN
        -- If negative or zero, assume next day
        calculated_duration := EXTRACT(EPOCH FROM (calculated_duration + INTERVAL '1 day')) / 3600.0;
      END IF;
      IF calculated_duration > 0 THEN
        RETURN ROUND(calculated_duration * 10) / 10;
      END IF;
    END IF;
  END IF;
  
  -- Return NULL if no duration can be calculated
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to update duration_hours for a product
CREATE OR REPLACE FUNCTION public.update_product_duration(
  p_product_id UUID,
  p_product_type TEXT
) RETURNS VOID AS $$
DECLARE
  calculated_duration NUMERIC;
BEGIN
  calculated_duration := public.calculate_product_duration(p_product_id, p_product_type);
  
  -- Only update if we have a valid positive duration (satisfies constraint: > 0 or NULL)
  IF calculated_duration IS NOT NULL AND calculated_duration > 0 THEN
    IF p_product_type = 'experience' THEN
      UPDATE public.experience
      SET duration_hours = calculated_duration
      WHERE id = p_product_id;
    ELSIF p_product_type = 'class' THEN
      UPDATE public.class
      SET duration_hours = calculated_duration
      WHERE id = p_product_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger function to auto-update duration when slots change
CREATE OR REPLACE FUNCTION public.trigger_update_product_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update duration when slot is inserted, updated, or deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_product_duration(OLD.product_id, OLD.product_type);
    RETURN OLD;
  ELSE
    PERFORM public.update_product_duration(NEW.product_id, NEW.product_type);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers on availability_slot
DROP TRIGGER IF EXISTS availability_slot_update_duration_insert ON public.availability_slot;
CREATE TRIGGER availability_slot_update_duration_insert
  AFTER INSERT ON public.availability_slot
  FOR EACH ROW
  WHEN (NEW.time_slot IS NOT NULL AND NEW.end_time IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_product_duration();

DROP TRIGGER IF EXISTS availability_slot_update_duration_update ON public.availability_slot;
CREATE TRIGGER availability_slot_update_duration_update
  AFTER UPDATE OF time_slot, end_time ON public.availability_slot
  FOR EACH ROW
  WHEN (NEW.time_slot IS NOT NULL AND NEW.end_time IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_product_duration();

DROP TRIGGER IF EXISTS availability_slot_update_duration_delete ON public.availability_slot;
CREATE TRIGGER availability_slot_update_duration_delete
  AFTER DELETE ON public.availability_slot
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_product_duration();

-- Step 6: Create trigger to update duration when full_day times change
CREATE OR REPLACE FUNCTION public.trigger_update_experience_duration()
RETURNS TRIGGER AS $$
DECLARE
  calculated_duration NUMERIC;
BEGIN
  -- Only update if full_day times changed and there are no slots with time
  IF (NEW.full_day_start_time IS DISTINCT FROM OLD.full_day_start_time OR
      NEW.full_day_end_time IS DISTINCT FROM OLD.full_day_end_time) THEN
    -- Check if there are slots with time_slot
    IF NOT EXISTS (
      SELECT 1 FROM public.availability_slot
      WHERE product_id = NEW.id
        AND product_type = 'experience'
        AND time_slot IS NOT NULL
        AND end_time IS NOT NULL
    ) THEN
      -- No slots with time, use full_day times
      IF NEW.full_day_start_time IS NOT NULL AND NEW.full_day_end_time IS NOT NULL THEN
        calculated_duration := EXTRACT(EPOCH FROM (NEW.full_day_end_time - NEW.full_day_start_time)) / 3600.0;
        -- Handle case where end_time < start_time (next day)
        IF calculated_duration <= 0 THEN
          calculated_duration := EXTRACT(EPOCH FROM (calculated_duration + INTERVAL '1 day')) / 3600.0;
        END IF;
        calculated_duration := ROUND(calculated_duration * 10) / 10;
        -- Ensure positive value (constraint requires > 0 or NULL)
        IF calculated_duration > 0 THEN
          NEW.duration_hours := calculated_duration;
        ELSE
          NEW.duration_hours := NULL;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_update_class_duration()
RETURNS TRIGGER AS $$
DECLARE
  calculated_duration NUMERIC;
BEGIN
  -- Only update if full_day times changed and there are no slots with time
  IF (NEW.full_day_start_time IS DISTINCT FROM OLD.full_day_start_time OR
      NEW.full_day_end_time IS DISTINCT FROM OLD.full_day_end_time) THEN
    -- Check if there are slots with time_slot
    IF NOT EXISTS (
      SELECT 1 FROM public.availability_slot
      WHERE product_id = NEW.id
        AND product_type = 'class'
        AND time_slot IS NOT NULL
        AND end_time IS NOT NULL
    ) THEN
      -- No slots with time, use full_day times
      IF NEW.full_day_start_time IS NOT NULL AND NEW.full_day_end_time IS NOT NULL THEN
        calculated_duration := EXTRACT(EPOCH FROM (NEW.full_day_end_time - NEW.full_day_start_time)) / 3600.0;
        -- Handle case where end_time < start_time (next day)
        IF calculated_duration <= 0 THEN
          calculated_duration := EXTRACT(EPOCH FROM (calculated_duration + INTERVAL '1 day')) / 3600.0;
        END IF;
        calculated_duration := ROUND(calculated_duration * 10) / 10;
        -- Ensure positive value (constraint requires > 0 or NULL)
        IF calculated_duration > 0 THEN
          NEW.duration_hours := calculated_duration;
        ELSE
          NEW.duration_hours := NULL;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experience_update_duration ON public.experience;
CREATE TRIGGER experience_update_duration
  BEFORE UPDATE OF full_day_start_time, full_day_end_time ON public.experience
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_experience_duration();

DROP TRIGGER IF EXISTS class_update_duration ON public.class;
CREATE TRIGGER class_update_duration
  BEFORE UPDATE OF full_day_start_time, full_day_end_time ON public.class
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_class_duration();

-- Step 7: Update existing products with calculated durations
DO $$
DECLARE
  product_record RECORD;
  calculated_duration NUMERIC;
BEGIN
  -- Update experiences
  FOR product_record IN
    SELECT id FROM public.experience WHERE active = true
  LOOP
    calculated_duration := public.calculate_product_duration(product_record.id, 'experience');
    -- Only update if we have a valid positive duration (satisfies constraint: > 0 or NULL)
    IF calculated_duration IS NOT NULL AND calculated_duration > 0 THEN
      UPDATE public.experience
      SET duration_hours = calculated_duration
      WHERE id = product_record.id;
    END IF;
  END LOOP;
  
  -- Update classes
  FOR product_record IN
    SELECT id FROM public.class WHERE active = true
  LOOP
    calculated_duration := public.calculate_product_duration(product_record.id, 'class');
    -- Only update if we have a valid positive duration (satisfies constraint: > 0 or NULL)
    IF calculated_duration IS NOT NULL AND calculated_duration > 0 THEN
      UPDATE public.class
      SET duration_hours = calculated_duration
      WHERE id = product_record.id;
    END IF;
  END LOOP;
END $$;

-- Add comments
COMMENT ON FUNCTION public.calculate_product_duration IS 'Calculates product duration from availability slots or full_day times';
COMMENT ON FUNCTION public.update_product_duration IS 'Updates duration_hours for a product based on its slots';
COMMENT ON COLUMN public.experience.duration_hours IS 'Automatically calculated from availability slots or full_day times. Can be NULL if no slots/times are set.';
COMMENT ON COLUMN public.class.duration_hours IS 'Automatically calculated from availability slots or full_day times. Can be NULL if no slots/times are set.';

