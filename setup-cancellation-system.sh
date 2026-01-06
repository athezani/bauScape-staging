#!/bin/bash

# Setup Cancellation System
# This script:
# 1. Applies database migrations
# 2. Deploys edge functions
# 3. Sets up environment variables
# 4. Runs tests

set -e

echo "=== CANCELLATION SYSTEM SETUP ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  echo "   Run: export SUPABASE_URL=your_url"
  echo "   Run: export SUPABASE_SERVICE_ROLE_KEY=your_key"
  exit 1
fi

echo "✅ Environment variables found"
echo ""

# Step 1: Apply database migration
echo "=== STEP 1: Applying database migration ==="
echo "Migration file: ecommerce-homepage/supabase/migrations/0020_create_cancellation_request.sql"

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "Using Supabase CLI..."
  cd ecommerce-homepage
  supabase db push
  cd ..
else
  echo "⚠️  Supabase CLI not found. Please apply migration manually:"
  echo "   1. Go to Supabase Dashboard > SQL Editor"
  echo "   2. Run the SQL from: ecommerce-homepage/supabase/migrations/0020_create_cancellation_request.sql"
  echo ""
  read -p "Press Enter after applying migration manually..."
fi

echo "✅ Migration applied"
echo ""

# Step 2: Deploy edge functions
echo "=== STEP 2: Deploying edge functions ==="

FUNCTIONS=(
  "create-cancellation-request"
  "admin-process-cancellation"
  "check-pending-cancellations"
)

cd baux-paws-access

for func in "${FUNCTIONS[@]}"; do
  echo "Deploying $func..."
  if command -v supabase &> /dev/null; then
    supabase functions deploy $func
  else
    echo "⚠️  Supabase CLI not found. Please deploy manually:"
    echo "   supabase functions deploy $func"
  fi
done

# Also redeploy send-transactional-email (updated with new templates)
echo "Deploying send-transactional-email (updated)..."
if command -v supabase &> /dev/null; then
  supabase functions deploy send-transactional-email
fi

cd ..

echo "✅ Edge functions deployed"
echo ""

# Step 3: Set environment variables (if not already set)
echo "=== STEP 3: Environment variables ==="
echo "Required secrets in Supabase:"
echo "  - CANCELLATION_TOKEN_SECRET (or uses SUPABASE_JWT_SECRET)"
echo "  - WEBSITE_URL (e.g., https://flixdog.com)"
echo "  - BREVO_TEMPLATE_CANCELLATION_REQUEST_ADMIN (template ID: 10)"
echo "  - BREVO_TEMPLATE_CANCELLATION_APPROVED (template ID: 11)"
echo "  - BREVO_TEMPLATE_CANCELLATION_REJECTED (template ID: 12)"
echo "  - BREVO_TEMPLATE_CANCELLATION_PROVIDER (template ID: 13)"
echo "  - BREVO_TEMPLATE_CANCELLATION_REMINDER (template ID: 14)"
echo ""
echo "Set these in Supabase Dashboard > Project Settings > Edge Functions > Secrets"
echo ""
read -p "Press Enter after setting secrets..."

echo "✅ Environment configured"
echo ""

# Step 4: Run unit tests
echo "=== STEP 4: Running unit tests ==="
echo "Testing token utilities..."

npx tsx test-cancellation-token.ts

echo "✅ Unit tests passed"
echo ""

# Step 5: Run E2E tests
echo "=== STEP 5: Running end-to-end tests ==="
echo "This will create 7 test bookings and cancellation requests"
echo "Check your email (a.thezani@gmail.com) for notifications"
echo ""

npx tsx test-cancellation-flow-e2e.ts

echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Create Brevo email templates (IDs 10-14) with the following variables:"
echo "   Template 10 (Admin Request): ORDER_NUMBER, CUSTOMER_NAME, CUSTOMER_EMAIL, PRODUCT_NAME, BOOKING_DATE, CANCELLATION_POLICY, CUSTOMER_REASON, ADMIN_PORTAL_LINK"
echo "   Template 11 (Approved Customer): CUSTOMER_NAME, ORDER_NUMBER, PRODUCT_NAME, BOOKING_DATE, ADMIN_NOTES"
echo "   Template 12 (Rejected Customer): CUSTOMER_NAME, ORDER_NUMBER, PRODUCT_NAME, BOOKING_DATE, ADMIN_NOTES"
echo "   Template 13 (Provider): PROVIDER_NAME, ORDER_NUMBER, CUSTOMER_NAME, PRODUCT_NAME, BOOKING_DATE"
echo "   Template 14 (Reminder): TOTAL_COUNT, URGENT_COUNT, URGENT_LIST, RECENT_LIST, ADMIN_PORTAL_LINK"
echo ""
echo "2. Update existing Brevo confirmation template to include CANCELLATION_LINK variable"
echo ""
echo "3. Set up cron job for check-pending-cancellations (daily at 09:00 UTC)"
echo "   Supabase Dashboard > Edge Functions > check-pending-cancellations > Cron Jobs"
echo "   Schedule: 0 9 * * * (every day at 09:00 UTC)"
echo ""
echo "4. Test the frontend pages:"
echo "   - https://flixdog.com/cancel/[token] (magic link)"
echo "   - https://flixdog.com/cancellation-request (manual form)"
echo ""
echo "✅ All done!"

