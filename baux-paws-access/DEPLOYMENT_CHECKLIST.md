# Deployment Checklist - Financial Tracking System

## Pre-Deployment Verification

### 1. Database Migrations
- [ ] Verify all migration files are present:
  - `20250115000000_add_pricing_model_to_products.sql`
  - `20250115000001_add_financial_fields_to_booking.sql`
  - `20250115000002_populate_products_with_placeholder_values.sql`
  - `20250115000003_update_booking_transactional_function.sql`

### 2. Apply Migrations
```bash
# Using Supabase CLI (if available)
cd baux-paws-access
supabase db push

# Or apply manually via Supabase Dashboard SQL Editor
# Run migrations in order: 00000, 00001, 00002, 00003
```

### 3. Verify Migrations Applied
```bash
# Run verification script
psql $DATABASE_URL -f verify_financial_tracking.sql
```

### 4. Test Pricing Calculations
```bash
# Run pricing calculation tests
psql $DATABASE_URL -f test_pricing_calculations.sql
```

## Post-Deployment Testing

### 1. Test Checkout Session Creation
- [ ] Test with product using **percentage** model
  - Verify price calculation: `price = provider_cost * (1 + margin_percentage/100)`
  - Check that `price_adult_base` and `price_dog_base` are calculated correctly
  
- [ ] Test with product using **markup** model
  - Verify price calculation: `price = provider_cost + markup_adult * num_adults + markup_dog * num_dogs`
  - Check that per-unit prices include markup

- [ ] Test with product using **legacy** model (no pricing_model set)
  - Verify fallback to old `price_adult_base` and `price_dog_base` fields

### 2. Test Booking Creation
- [ ] Create booking via Stripe webhook
- [ ] Verify `provider_cost_total` is calculated correctly
- [ ] Verify `stripe_fee` is retrieved from Stripe API
- [ ] Verify `internal_margin` = `total_amount_paid - provider_cost_total - stripe_fee`
- [ ] Verify `net_revenue` = `internal_margin`

### 3. Test Stripe Fee Retrieval
- [ ] Verify fee is retrieved from PaymentIntent → Charge → BalanceTransaction
- [ ] Test with different payment methods (card, bank transfer, etc.)
- [ ] Verify fee varies based on payment method
- [ ] Handle cases where fee cannot be retrieved (graceful fallback to 0)

### 4. Edge Cases
- [ ] Test with products that have `no_adults = true` (guests = 0)
- [ ] Test with products that have `provider_cost_dog_base = 0`
- [ ] Test with very small amounts (minimum Stripe amount: 0.50 EUR)
- [ ] Test with large amounts
- [ ] Test idempotency (same booking created twice)

## Monitoring

### 1. Check Logs
Monitor Edge Function logs for:
- Pricing calculation errors
- Stripe API errors when retrieving fees
- Financial calculation warnings

### 2. Database Queries
```sql
-- Check products with pricing models
SELECT 
  product_type,
  pricing_model,
  COUNT(*) as count
FROM (
  SELECT 'experience' as product_type, pricing_model FROM experience WHERE active = true
  UNION ALL
  SELECT 'class', pricing_model FROM class WHERE active = true
  UNION ALL
  SELECT 'trip', pricing_model FROM trip WHERE active = true
) products
GROUP BY product_type, pricing_model;

-- Check bookings with financial data
SELECT 
  COUNT(*) as total_bookings,
  COUNT(provider_cost_total) as with_provider_cost,
  COUNT(stripe_fee) as with_stripe_fee,
  COUNT(internal_margin) as with_margin,
  AVG(internal_margin) as avg_margin
FROM booking
WHERE created_at > NOW() - INTERVAL '7 days';

-- Check for bookings with missing financial data
SELECT 
  id,
  order_number,
  product_name,
  total_amount_paid,
  provider_cost_total,
  stripe_fee,
  internal_margin,
  created_at
FROM booking
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (provider_cost_total IS NULL OR stripe_fee IS NULL OR internal_margin IS NULL)
ORDER BY created_at DESC;
```

## Rollback Plan

If issues are detected:

1. **Disable new pricing logic** (temporary):
   - Revert `create-checkout-session` to use only `price_adult_base` and `price_dog_base`
   - Set financial fields to NULL in booking creation

2. **Database rollback** (if needed):
   ```sql
   -- Remove financial fields from booking (if needed)
   ALTER TABLE booking DROP COLUMN IF EXISTS provider_cost_total;
   ALTER TABLE booking DROP COLUMN IF EXISTS stripe_fee;
   ALTER TABLE booking DROP COLUMN IF EXISTS internal_margin;
   ALTER TABLE booking DROP COLUMN IF EXISTS net_revenue;
   ```

## Success Criteria

✅ All migrations applied successfully  
✅ All products have pricing data populated  
✅ Checkout sessions created with correct pricing  
✅ Bookings created with financial data  
✅ Stripe fees retrieved correctly  
✅ No errors in Edge Function logs  
✅ Financial calculations are accurate  

