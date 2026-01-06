-- Update validate_booking_status_change to prevent manual "completed" status
-- Only allow automatic completion via system
CREATE OR REPLACE FUNCTION public.validate_booking_status_change(
  _booking_id uuid,
  _new_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
  _provider_id uuid;
BEGIN
  -- Get current status and verify ownership
  SELECT status, provider_id INTO _current_status, _provider_id
  FROM public.bookings 
  WHERE id = _booking_id;
  
  -- Verify the booking exists and belongs to the current user
  IF _provider_id IS NULL OR _provider_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Block changes from terminal states
  IF _current_status IN ('completed', 'cancelled') THEN
    RETURN false;
  END IF;
  
  -- Block manual completion - only system can set to completed
  IF _new_status = 'completed' THEN
    RETURN false;
  END IF;
  
  -- Valid transitions only (removed completed from valid transitions)
  IF _current_status = 'pending' AND _new_status IN ('confirmed', 'cancelled') THEN
    RETURN true;
  ELSIF _current_status = 'confirmed' AND _new_status = 'cancelled' THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;