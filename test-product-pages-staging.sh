#!/bin/bash
# Test product pages on staging to check for 500 errors

set -e

STAGING_URL="${1:-https://staging.flixdog.com}"

echo "🔍 Testing product pages on staging: $STAGING_URL"
echo ""

# Test debug endpoint first
echo "1. Testing debug endpoint..."
DEBUG_RESPONSE=$(curl -s -w "\n%{http_code}" "$STAGING_URL/api/debug-product?id=5af81c69-6f5a-450d-9646-a8c68be3115a&type=trip" || echo "ERROR")
HTTP_CODE=$(echo "$DEBUG_RESPONSE" | tail -n1)
BODY=$(echo "$DEBUG_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Debug endpoint responded with 200"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Debug endpoint failed with HTTP $HTTP_CODE"
  echo "$BODY"
fi

echo ""
echo "2. Testing product pages..."

# Test a few product pages
PRODUCTS=(
  "trip/5af81c69-6f5a-450d-9646-a8c68be3115a"
  "experience/5af81c69-6f5a-450d-9646-a8c68be3115a"
  "class/5af81c69-6f5a-450d-9646-a8c68be3115a"
)

FAILED=0
PASSED=0

for product in "${PRODUCTS[@]}"; do
  URL="$STAGING_URL/prodotto/$product"
  echo -n "Testing $URL... "
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ OK (200)"
    PASSED=$((PASSED + 1))
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  Not Found (404) - Product might not exist"
    PASSED=$((PASSED + 1))
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ Server Error (500)"
    FAILED=$((FAILED + 1))
    echo "   Fetching error details..."
    curl -s "$URL" | head -50
  else
    echo "❌ Unexpected status: $HTTP_CODE"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=========================================="
echo "Test Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0

