#!/bin/bash

# Script to find booking by session ID or similar

SESSION_ID="cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI"
SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

echo "=== Searching for Booking ==="
echo "Session ID: $SESSION_ID"
echo ""

# Try exact match
echo "1. Searching for exact match..."
EXACT_RESULT=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=eq.${SESSION_ID}&select=id,customer_email,product_name,stripe_checkout_session_id,created_at&limit=1")

EXACT_HTTP_CODE=$(echo "$EXACT_RESULT" | tail -n1)
EXACT_BODY=$(echo "$EXACT_RESULT" | sed '$d')

if [ "$EXACT_HTTP_CODE" = "200" ]; then
  EXACT_COUNT=$(echo "$EXACT_BODY" | jq -r '. | length' 2>/dev/null)
  if [ "$EXACT_COUNT" != "" ] && [ "$EXACT_COUNT" != "0" ]; then
    echo "✅ Found exact match!"
    echo "$EXACT_BODY" | jq '.'
    exit 0
  fi
fi

echo "   No exact match found"
if [ "$EXACT_HTTP_CODE" != "200" ]; then
  echo "   HTTP Error: $EXACT_HTTP_CODE"
  echo "   Response: $EXACT_BODY"
fi
echo ""

# Try partial match (last 20 chars)
echo "2. Searching for partial match (last 20 chars)..."
PARTIAL_ID="${SESSION_ID: -20}"
PARTIAL_RESULT=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=ilike.%${PARTIAL_ID}%&select=id,customer_email,product_name,stripe_checkout_session_id,created_at&limit=10")

PARTIAL_HTTP_CODE=$(echo "$PARTIAL_RESULT" | tail -n1)
PARTIAL_BODY=$(echo "$PARTIAL_RESULT" | sed '$d')

if [ "$PARTIAL_HTTP_CODE" != "200" ]; then
  echo "   HTTP Error: $PARTIAL_HTTP_CODE"
  echo "   Response: $PARTIAL_BODY"
else
  PARTIAL_COUNT=$(echo "$PARTIAL_BODY" | jq -r '. | length' 2>/dev/null)
  if [ "$PARTIAL_COUNT" != "" ] && [ "$PARTIAL_COUNT" != "0" ]; then
    echo "✅ Found $PARTIAL_COUNT similar bookings:"
    echo "$PARTIAL_BODY" | jq '.'
    exit 0
  fi
fi

echo "   No partial match found"
echo ""

# Show recent bookings
echo "3. Showing 10 most recent bookings..."
RECENT_RESULT=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "${SUPABASE_URL}/rest/v1/booking?select=id,customer_email,product_name,stripe_checkout_session_id,created_at&order=created_at.desc&limit=10")

RECENT_HTTP_CODE=$(echo "$RECENT_RESULT" | tail -n1)
RECENT_BODY=$(echo "$RECENT_RESULT" | sed '$d')

if [ "$RECENT_HTTP_CODE" != "200" ]; then
  echo "❌ HTTP Error: $RECENT_HTTP_CODE"
  echo "Response: $RECENT_BODY"
else
  RECENT_COUNT=$(echo "$RECENT_BODY" | jq -r '. | length' 2>/dev/null)
  if [ "$RECENT_COUNT" != "" ] && [ "$RECENT_COUNT" != "0" ]; then
    echo "Found $RECENT_COUNT recent bookings:"
    echo "$RECENT_BODY" | jq '.'
    echo ""
    echo "Check if any of these session IDs match your payment:"
    echo "$RECENT_BODY" | jq -r '.[] | "  - \(.stripe_checkout_session_id // "NULL")"' 2>/dev/null || echo "$RECENT_BODY"
  else
    echo "❌ No bookings found in database"
    echo ""
    echo "This means:"
    echo "  1. The webhook might not have been called"
    echo "  2. The booking creation failed"
    echo "  3. The payment was not completed"
    echo ""
    echo "Raw response: $RECENT_BODY"
  fi
fi

