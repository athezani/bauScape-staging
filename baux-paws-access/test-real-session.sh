#!/bin/bash

# Test with real session ID from website
SESSION_ID="cs_test_b1hrXhNUgqbzo3oArqNxQRLiYLaoFLGb7Z7XtLKjxc37UJitnBaAKoMgEE"
SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

echo "=== Testing Real Session from Website ==="
echo "Session ID: $SESSION_ID"
echo ""

# Step 1: Check if booking exists
echo "Step 1: Checking if booking exists..."
BOOKING_CHECK=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=eq.${SESSION_ID}&select=id&limit=1")

BOOKING_COUNT=$(echo "$BOOKING_CHECK" | jq '. | length' 2>/dev/null)

if [ "$BOOKING_COUNT" != "0" ] && [ -n "$BOOKING_COUNT" ]; then
  echo "✅ Booking already exists!"
  echo "$BOOKING_CHECK" | jq '.'
  exit 0
fi

echo "❌ Booking not found"
echo ""

# Step 2: Test ensure-booking function
echo "Step 2: Testing ensure-booking function..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"sessionId\":\"$SESSION_ID\"}" \
  "${SUPABASE_URL}/functions/v1/ensure-booking")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Code: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ ensure-booking function worked!"
    BOOKING_ID=$(echo "$BODY" | jq -r '.bookingId' 2>/dev/null)
    echo "Booking ID: $BOOKING_ID"
    
    # Verify booking was created
    echo ""
    echo "Step 3: Verifying booking in database..."
    VERIFY=$(curl -s \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "${SUPABASE_URL}/rest/v1/booking?id=eq.${BOOKING_ID}&select=id,customer_email,product_name,created_at&limit=1")
    
    echo "$VERIFY" | jq '.'
  else
    echo "❌ ensure-booking returned success=false"
    exit 1
  fi
else
  echo "❌ ensure-booking failed"
  exit 1
fi




