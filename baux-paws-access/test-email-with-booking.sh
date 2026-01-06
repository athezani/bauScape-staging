#!/bin/bash

# Script to test email sending with a booking from the database
# Usage: 
#   SUPABASE_SERVICE_ROLE_KEY=your_key ./test-email-with-booking.sh [test_email]
#   SUPABASE_SERVICE_ROLE_KEY=your_key ./test-email-with-booking.sh [booking_id] [test_email]
# Examples:
#   ./test-email-with-booking.sh a.thezani@gmail.com
#   ./test-email-with-booking.sh <booking_id> a.thezani@gmail.com

SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"

# Parse arguments: if first arg looks like email, it's test email; otherwise it's booking_id
if [ -n "$1" ] && [[ "$1" == *"@"* ]]; then
  # First argument is an email (contains @)
  TEST_EMAIL="$1"
  BOOKING_ID_ARG=""
else
  # First argument is booking ID (or empty)
  BOOKING_ID_ARG="$1"
  TEST_EMAIL="${2:-}"  # Second argument is test email (optional)
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

# If booking ID provided, use it; otherwise show recent bookings
if [ -n "$BOOKING_ID_ARG" ]; then
  BOOKING_ID="$BOOKING_ID_ARG"
  echo "=== Testing Email with Booking ID: $BOOKING_ID ==="
else
  echo "=== Recent Bookings ==="
  echo ""
  
  # Get recent bookings
  RECENT_RESULT=$(curl -s -w "\n%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/rest/v1/booking?select=id,customer_email,customer_name,product_name,stripe_checkout_session_id,created_at&order=created_at.desc&limit=5")

  RECENT_HTTP_CODE=$(echo "$RECENT_RESULT" | tail -n1)
  RECENT_BODY=$(echo "$RECENT_RESULT" | sed '$d')

  if [ "$RECENT_HTTP_CODE" != "200" ]; then
    echo "❌ Failed to fetch bookings: $RECENT_HTTP_CODE"
    echo "$RECENT_BODY"
    exit 1
  fi

  RECENT_COUNT=$(echo "$RECENT_BODY" | jq -r '. | length' 2>/dev/null)
  if [ "$RECENT_COUNT" = "0" ] || [ -z "$RECENT_COUNT" ]; then
    echo "❌ No bookings found"
    exit 1
  fi

  echo "Found $RECENT_COUNT recent bookings:"
  echo ""
  echo "$RECENT_BODY" | jq -r '.[] | "\(.id) - \(.customer_email) - \(.product_name) - \(.created_at)"'
  echo ""
  echo "Using the most recent booking..."
  BOOKING_ID=$(echo "$RECENT_BODY" | jq -r '.[0].id')
  echo "Booking ID: $BOOKING_ID"
  echo ""
fi

# Fetch full booking details
echo "Fetching booking details..."
BOOKING_RESULT=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "${SUPABASE_URL}/rest/v1/booking?id=eq.${BOOKING_ID}&select=*&limit=1")

BOOKING_HTTP_CODE=$(echo "$BOOKING_RESULT" | tail -n1)
BOOKING_BODY=$(echo "$BOOKING_RESULT" | sed '$d')

if [ "$BOOKING_HTTP_CODE" != "200" ]; then
  echo "❌ Failed to fetch booking: $BOOKING_HTTP_CODE"
  echo "$BOOKING_BODY"
  exit 1
fi

BOOKING=$(echo "$BOOKING_BODY" | jq '.[0]')
if [ "$BOOKING" = "null" ] || [ -z "$BOOKING" ]; then
  echo "❌ Booking not found"
  exit 1
fi

echo "✅ Booking found:"
echo "$BOOKING" | jq '{id, customer_email, customer_name, customer_surname, product_name, booking_date, booking_time, number_of_adults, number_of_dogs, total_amount_paid, currency}'
echo ""

# Prepare email payload
echo "Preparing email payload..."

# Use test email if provided, otherwise use booking customer email
if [ -n "$TEST_EMAIL" ]; then
  SEND_TO_EMAIL="$TEST_EMAIL"
  ORIGINAL_EMAIL=$(echo "$BOOKING" | jq -r '.customer_email')
  echo "⚠️  Using test email: $SEND_TO_EMAIL (original: $ORIGINAL_EMAIL)"
else
  SEND_TO_EMAIL=$(echo "$BOOKING" | jq -r '.customer_email')
  echo "Using booking customer email: $SEND_TO_EMAIL"
fi

ORDER_NUMBER=$(echo "$BOOKING" | jq -r '.stripe_checkout_session_id' | tail -c 9 | tr '[:lower:]' '[:upper:]')

EMAIL_PAYLOAD=$(cat <<PAYLOAD
{
  "type": "order_confirmation",
  "bookingId": $(echo "$BOOKING" | jq -r '.id | @json'),
  "customerEmail": "$SEND_TO_EMAIL",
  "customerName": $(echo "$BOOKING" | jq -r 'if .customer_name then .customer_name | @json else "Cliente" | @json end'),
  "customerSurname": $(echo "$BOOKING" | jq -r 'if .customer_surname then .customer_surname | @json else empty end'),
  "customerPhone": $(echo "$BOOKING" | jq -r 'if .customer_phone then .customer_phone | @json else empty end'),
  "productName": $(echo "$BOOKING" | jq -r '.product_name | @json'),
  "productDescription": $(echo "$BOOKING" | jq -r 'if .product_description then .product_description | @json else empty end'),
  "productType": $(echo "$BOOKING" | jq -r '.product_type | @json'),
  "bookingDate": $(echo "$BOOKING" | jq -r '.booking_date | @json'),
  "bookingTime": $(echo "$BOOKING" | jq -r 'if .booking_time then .booking_time | @json else null end'),
  "numberOfAdults": $(echo "$BOOKING" | jq -r '.number_of_adults // 1'),
  "numberOfDogs": $(echo "$BOOKING" | jq -r '.number_of_dogs // 0'),
  "totalAmount": $(echo "$BOOKING" | jq -r '.total_amount_paid // 0'),
  "currency": $(echo "$BOOKING" | jq -r '.currency // "EUR" | @json'),
  "orderNumber": "$ORDER_NUMBER"
}
PAYLOAD
)

echo "Email payload:"
echo "$EMAIL_PAYLOAD" | jq '.'
echo ""

# Send email
echo "Sending email..."
EMAIL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$EMAIL_PAYLOAD" \
  "${SUPABASE_URL}/functions/v1/send-transactional-email")

EMAIL_HTTP_CODE=$(echo "$EMAIL_RESPONSE" | tail -n1)
EMAIL_BODY=$(echo "$EMAIL_RESPONSE" | sed '$d')

echo ""
if [ "$EMAIL_HTTP_CODE" = "200" ]; then
  echo "✅ EMAIL SENT SUCCESSFULLY!"
  echo "$EMAIL_BODY" | jq '.'
  echo ""
  echo "📧 Please check your inbox at: $SEND_TO_EMAIL"
  if [ -n "$TEST_EMAIL" ]; then
    echo "   (Test email - original booking email: $(echo "$BOOKING" | jq -r '.customer_email'))"
  fi
  echo "   (Also check spam folder if not found)"
else
  echo "❌ EMAIL SENDING FAILED"
  echo "   HTTP Code: $EMAIL_HTTP_CODE"
  echo "$EMAIL_BODY" | jq '.' 2>/dev/null || echo "$EMAIL_BODY"
fi

