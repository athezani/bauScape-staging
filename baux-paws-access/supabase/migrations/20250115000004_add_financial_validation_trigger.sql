-- ============================================
-- Add Financial Validation Trigger
-- ============================================
-- This trigger ensures that financial calculations are always correct to the cent
-- It validates: internal_margin = total_amount_paid - provider_cost_total - stripe_fee
-- ============================================

-- Create function to validate financial calculations
CREATE OR REPLACE FUNCTION public.validate_booking_financials()
RETURNS TRIGGER AS $$
DECLARE
  calculated_margin NUMERIC(10,2);
  margin_difference NUMERIC(10,2);
BEGIN
  -- Only validate if financial fields are present
  IF NEW.provider_cost_total IS NOT NULL 
     AND NEW.internal_margin IS NOT NULL 
     AND NEW.total_amount_paid IS NOT NULL THEN
    
    -- Calculate expected margin
    calculated_margin := NEW.total_amount_paid - COALESCE(NEW.provider_cost_total, 0) - COALESCE(NEW.stripe_fee, 0);
    
    -- Round to 2 decimal places for comparison
    calculated_margin := ROUND(calculated_margin, 2);
    
    -- Calculate difference
    margin_difference := ABS(NEW.internal_margin - calculated_margin);
    
    -- Allow tolerance of 0.01 cent for floating point rounding
    IF margin_difference > 0.01 THEN
      RAISE EXCEPTION 'Financial calculation mismatch: internal_margin (%) does not match calculated value (%). Difference: % cents. Expected: total_amount_paid (%) - provider_cost_total (%) - stripe_fee (%) = %',
        NEW.internal_margin,
        calculated_margin,
        margin_difference * 100,
        NEW.total_amount_paid,
        COALESCE(NEW.provider_cost_total, 0),
        COALESCE(NEW.stripe_fee, 0),
        calculated_margin;
    END IF;
    
    -- Also validate net_revenue matches internal_margin
    IF NEW.net_revenue IS NOT NULL THEN
      IF ABS(NEW.net_revenue - NEW.internal_margin) > 0.01 THEN
        RAISE EXCEPTION 'Financial calculation mismatch: net_revenue (%) does not match internal_margin (%)',
          NEW.net_revenue,
          NEW.internal_margin;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger BEFORE INSERT or UPDATE
DROP TRIGGER IF EXISTS validate_booking_financials_trigger ON public.booking;
CREATE TRIGGER validate_booking_financials_trigger
  BEFORE INSERT OR UPDATE ON public.booking
  FOR EACH ROW
  WHEN (
    NEW.provider_cost_total IS NOT NULL 
    AND NEW.internal_margin IS NOT NULL 
    AND NEW.total_amount_paid IS NOT NULL
  )
  EXECUTE FUNCTION public.validate_booking_financials();

COMMENT ON FUNCTION public.validate_booking_financials() IS 
  'Validates that financial calculations are correct to the cent: internal_margin = total_amount_paid - provider_cost_total - stripe_fee';

COMMENT ON TRIGGER validate_booking_financials_trigger ON public.booking IS 
  'Ensures financial calculations are always correct to the cent before insert/update';

