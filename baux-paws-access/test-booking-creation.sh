#!/bin/bash

# Test script to verify booking creation flow
# This script tests the ensure-booking function and the complete flow

SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

echo "=== Testing Booking Creation Flow ==="
echo ""

# Test 1: Check if ensure-booking function is deployed
echo "Test 1: Checking if ensure-booking function exists..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"sessionId":"test"}' \
  "${SUPABASE_URL}/functions/v1/ensure-booking")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "404" ]; then
  echo "❌ ensure-booking function not deployed!"
  echo "   Deploy it with: npx supabase functions deploy ensure-booking"
  exit 1
fi

echo "✅ ensure-booking function exists"
echo ""

# Test 2: Get a real session ID from recent booking
echo "Test 2: Finding a real session ID to test with..."
RECENT_BOOKING=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${SUPABASE_URL}/rest/v1/booking?select=stripe_checkout_session_id&order=created_at.desc&limit=1")

SESSION_ID=$(echo "$RECENT_BOOKING" | jq -r '.[0].stripe_checkout_session_id' 2>/dev/null)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "⚠️  No recent bookings found. You'll need to complete a test payment first."
  echo ""
  echo "To test the complete flow:"
  echo "  1. Go to your website and complete a test payment"
  echo "  2. Note the session_id from the thank you page URL"
  echo "  3. Run this script again or test manually:"
  echo "     SUPABASE_SERVICE_ROLE_KEY=key ./test-booking-creation.sh <session_id>"
  exit 0
fi

echo "✅ Found session ID: ${SESSION_ID:0:20}..."
echo ""

# Test 3: Test ensure-booking with real session
if [ -n "$1" ]; then
  TEST_SESSION_ID="$1"
else
  TEST_SESSION_ID="$SESSION_ID"
fi

echo "Test 3: Testing ensure-booking with session ID..."
echo "Session ID: $TEST_SESSION_ID"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"sessionId\":\"$TEST_SESSION_ID\"}" \
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
    echo "✅ ensure-booking function works correctly!"
    BOOKING_ID=$(echo "$BODY" | jq -r '.bookingId' 2>/dev/null)
    ALREADY_EXISTED=$(echo "$BODY" | jq -r '.alreadyExisted' 2>/dev/null)
    
    if [ "$ALREADY_EXISTED" = "true" ]; then
      echo "   Booking already existed (created by webhook)"
    else
      echo "   Booking was created by ensure-booking function"
    fi
    echo "   Booking ID: $BOOKING_ID"
  else
    echo "❌ ensure-booking returned success=false"
    exit 1
  fi
else
  echo "❌ ensure-booking failed with HTTP $HTTP_CODE"
  exit 1
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Next steps:"
echo "  1. Complete a test payment on your website"
echo "  2. Check that the booking is created immediately"
echo "  3. Check that the confirmation email is sent"
echo "  4. Verify the booking appears in the database"




