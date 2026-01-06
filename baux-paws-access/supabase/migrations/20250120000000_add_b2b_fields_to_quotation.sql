-- ============================================
-- ADD B2B FIELDS TO QUOTATION TABLE
-- ============================================
-- This migration adds B2B (business) fields to the quotation table
-- to support both B2C (private) and B2B (company/professional) customers
-- 
-- Purpose:
-- - Support Italian electronic invoicing requirements
-- - Store company/professional customer data
-- - Maintain compatibility with Odoo partner creation
-- ============================================

-- Add B2B flag
ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN NOT NULL DEFAULT false;

-- Add B2B company fields
ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS company_name TEXT; -- Ragione Sociale (or Nome+Cognome for ditta individuale)

ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS company_vat_number TEXT; -- Partita IVA

ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS company_sdi_code TEXT; -- Codice Destinatario SDI (7 alphanumeric chars)

ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS company_pec_email TEXT; -- PEC email

-- Add address province field (for both B2C and B2B)
ALTER TABLE IF EXISTS public.quotation 
ADD COLUMN IF NOT EXISTS customer_address_province TEXT; -- Provincia

-- Make fiscal code required (no longer optional)
-- Note: We keep it nullable in DB but validation will enforce it in application
-- This allows for backward compatibility with existing records

-- Add comments for documentation
COMMENT ON COLUMN public.quotation.is_b2b IS 'True if customer is a company/professional (B2B), false for private (B2C)';
COMMENT ON COLUMN public.quotation.company_name IS 'Company name (Ragione Sociale) or Name+Surname for ditta individuale (B2B only)';
COMMENT ON COLUMN public.quotation.company_vat_number IS 'Partita IVA (VAT number) - 11 digits (B2B only)';
COMMENT ON COLUMN public.quotation.company_sdi_code IS 'Codice Destinatario SDI - 7 alphanumeric characters (B2B only, alternative to PEC)';
COMMENT ON COLUMN public.quotation.company_pec_email IS 'PEC email address (B2B only, alternative to SDI code)';
COMMENT ON COLUMN public.quotation.customer_address_province IS 'Province (Provincia) - required for both B2C and B2B';

-- Create index for B2B queries
CREATE INDEX IF NOT EXISTS quotation_is_b2b_idx ON public.quotation(is_b2b);
CREATE INDEX IF NOT EXISTS quotation_company_vat_idx ON public.quotation(company_vat_number) WHERE company_vat_number IS NOT NULL;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ B2B fields added to quotation table successfully!';
END $$;

