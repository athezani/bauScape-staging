# Integration Tests Guide for Create Booking Function

## Overview

This document provides detailed instructions for running integration tests for the refactored booking creation function.

## Prerequisites

1. **Test Environment Setup**
   - Supabase project with test database
   - Stripe test account with API keys
   - Environment variables configured

2. **Test Data**
   - Test products (experience, class, trip)
   - Test availability slots
   - Test provider accounts

## Test Scenarios

### Test 1: Idempotency - Duplicate Payment Prevention

**Objective**: Verify that duplicate requests with the same idempotency key do not create duplicate bookings.

**Steps**:
1. Create a test Stripe checkout session with payment status "paid"
2. Call `create-booking` function with session ID and idempotency key `test-key-1`
3. Verify booking is created successfully
4. Call `create-booking` function again with the same session ID and idempotency key `test-key-1`
5. Verify response indicates booking already exists
6. Verify only one booking exists in database

**Expected Result**:
- First call: `{ success: true, bookingId: "...", alreadyExisted: false }`
- Second call: `{ success: true, bookingId: "...", alreadyExisted: true }`
- Database: Only one booking record

**Verification SQL**:
```sql
SELECT COUNT(*) FROM booking 
WHERE idempotency_key = 'test-key-1';
-- Should return 1
```

---

### Test 2: Race Condition - Overbooking Prevention

**Objective**: Verify that concurrent requests cannot overbook a slot with limited capacity.

**Steps**:
1. Create an availability slot with `max_adults = 2`, `booked_adults = 1` (1 remaining)
2. Create two test Stripe checkout sessions
3. Make two concurrent requests to book 1 adult each
4. Verify only one booking succeeds
5. Verify the other fails with capacity error
6. Verify availability slot shows `booked_adults = 2` (fully booked)

**Expected Result**:
- One request succeeds: `{ success: true, bookingId: "..." }`
- One request fails: `{ error: "Insufficient adult capacity..." }`
- Availability slot: `booked_adults = 2`, `max_adults = 2`

**Verification SQL**:
```sql
-- Check availability slot
SELECT booked_adults, max_adults FROM availability_slot 
WHERE id = '<slot-id>';
-- Should show booked_adults = 2

-- Check bookings
SELECT COUNT(*) FROM booking 
WHERE availability_slot_id = '<slot-id>' 
AND status = 'confirmed';
-- Should return 1 (only one succeeded)
```

---

### Test 3: Database Failure - Rollback Verification

**Objective**: Verify that if database write fails, availability is not decremented and no booking is created.

**Steps**:
1. Create an availability slot with known capacity
2. Simulate database failure (e.g., invalid data that causes constraint violation)
3. Attempt to create booking
4. Verify booking creation fails
5. Verify availability slot capacity is unchanged
6. Verify no booking record exists

**Expected Result**:
- Request fails: `{ error: "Failed to create booking: ..." }`
- Availability slot: Capacity unchanged
- No booking record created

**Verification SQL**:
```sql
-- Check availability slot (should be unchanged)
SELECT booked_adults, max_adults FROM availability_slot 
WHERE id = '<slot-id>';

-- Verify no booking exists
SELECT COUNT(*) FROM booking 
WHERE stripe_checkout_session_id = '<session-id>';
-- Should return 0
```

---

### Test 4: Event Emission - Odoo Integration

**Objective**: Verify that booking events are automatically emitted for external system integration.

**Steps**:
1. Create a booking successfully
2. Query `booking_events` table
3. Verify event exists with correct data
4. Verify event contains complete booking information

**Expected Result**:
- Event created: `{ id: "...", event_type: "created", status: "pending" }`
- Event data contains all booking fields
- Event is linked to booking via `booking_id`

**Verification SQL**:
```sql
-- Check event was created
SELECT 
  id,
  booking_id,
  event_type,
  status,
  event_data->>'customer_email' as customer_email,
  event_data->>'product_name' as product_name
FROM booking_events
WHERE booking_id = '<booking-id>'
AND event_type = 'created';
-- Should return 1 row with status = 'pending'
```

---

## Running Tests

### Manual Testing

1. **Set up test environment**:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
export STRIPE_SECRET_KEY="sk_test_..."
```

2. **Deploy function**:
```bash
cd baux-paws-access
npx supabase functions deploy create-booking
```

3. **Run test script**:
```bash
# Test idempotency
curl -X POST https://your-project.supabase.co/functions/v1/create-booking \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "stripeCheckoutSessionId": "cs_test_...",
    "idempotencyKey": "test-key-1"
  }'
```

### Automated Testing

Create a test script that:
1. Sets up test data
2. Runs each test scenario
3. Verifies results
4. Cleans up test data

Example test script structure:
```typescript
async function runIntegrationTests() {
  // Setup
  const testData = await setupTestData();
  
  // Test 1: Idempotency
  await testIdempotency(testData);
  
  // Test 2: Race Condition
  await testRaceCondition(testData);
  
  // Test 3: Database Failure
  await testDatabaseFailure(testData);
  
  // Test 4: Event Emission
  await testEventEmission(testData);
  
  // Cleanup
  await cleanupTestData(testData);
}
```

## Test Data Cleanup

After running tests, clean up test data:

```sql
-- Remove test bookings
DELETE FROM booking 
WHERE idempotency_key LIKE 'test-%';

-- Remove test events
DELETE FROM booking_events 
WHERE booking_id IN (
  SELECT id FROM booking WHERE idempotency_key LIKE 'test-%'
);

-- Reset availability slots (if needed)
UPDATE availability_slot 
SET booked_adults = 0, booked_dogs = 0
WHERE id IN (SELECT availability_slot_id FROM booking WHERE idempotency_key LIKE 'test-%');
```

## Monitoring and Logging

All test runs should be logged. Check function logs:

```bash
npx supabase functions logs create-booking
```

Look for:
- Request IDs
- Phase transitions
- Error messages
- Success confirmations

## Success Criteria

All tests pass if:
1. ✅ Idempotency prevents duplicate bookings
2. ✅ Race conditions are handled correctly
3. ✅ Database failures rollback properly
4. ✅ Events are emitted for all successful bookings
5. ✅ Logging provides complete traceability



