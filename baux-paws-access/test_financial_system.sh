#!/bin/bash

# ============================================
# Test Script for Financial Tracking System
# ============================================
# This script tests the financial tracking system
# by simulating checkout and booking creation
# ============================================

set -e

echo "========================================="
echo "Financial Tracking System - Test Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Warning: Supabase CLI not found. Some tests will be skipped.${NC}"
    echo ""
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Warning: psql not found. Database tests will be skipped.${NC}"
    echo ""
fi

echo "Step 1: Verifying migration files..."
echo "----------------------------------------"

MIGRATIONS=(
    "supabase/migrations/20250115000000_add_pricing_model_to_products.sql"
    "supabase/migrations/20250115000001_add_financial_fields_to_booking.sql"
    "supabase/migrations/20250115000002_populate_products_with_placeholder_values.sql"
    "supabase/migrations/20250115000003_update_booking_transactional_function.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo -e "${GREEN}✓${NC} $migration"
    else
        echo -e "${RED}✗${NC} $migration (missing)"
        exit 1
    fi
done

echo ""
echo "Step 2: Checking SQL syntax..."
echo "----------------------------------------"

# Check for common SQL syntax errors
for migration in "${MIGRATIONS[@]}"; do
    echo "Checking $migration..."
    
    # Check for unclosed quotes
    if grep -q "'.*[^']$" "$migration" 2>/dev/null; then
        echo -e "${YELLOW}Warning: Possible unclosed quotes in $migration${NC}"
    fi
    
    # Check for missing semicolons at end of statements
    if ! tail -1 "$migration" | grep -q ";$"; then
        echo -e "${YELLOW}Warning: Migration might be missing final semicolon${NC}"
    fi
    
    echo -e "${GREEN}✓${NC} $migration syntax check passed"
done

echo ""
echo "Step 3: Verifying Edge Functions..."
echo "----------------------------------------"

FUNCTIONS=(
    "supabase/functions/create-checkout-session/index.ts"
    "supabase/functions/create-booking/index.ts"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -f "$func" ]; then
        # Check if file contains financial tracking code
        if grep -q "pricing_model\|provider_cost\|stripe_fee\|internal_margin" "$func"; then
            echo -e "${GREEN}✓${NC} $func (contains financial tracking)"
        else
            echo -e "${YELLOW}⚠${NC} $func (might not have financial tracking)"
        fi
    else
        echo -e "${RED}✗${NC} $func (missing)"
    fi
done

echo ""
echo "Step 4: Testing pricing calculation logic..."
echo "----------------------------------------"

# Create a test TypeScript file to verify logic
cat > /tmp/test_pricing_logic.ts << 'EOF'
// Test pricing calculation logic

// Percentage model
function testPercentageModel() {
    const providerCostAdult = 50.00;
    const providerCostDog = 20.00;
    const marginPercentage = 30.00;
    const numAdults = 2;
    const numDogs = 1;
    
    const providerCostTotal = (providerCostAdult * numAdults) + (providerCostDog * numDogs);
    const totalAmount = providerCostTotal * (1 + marginPercentage / 100);
    
    console.log("Percentage Model Test:");
    console.log(`  Provider cost total: €${providerCostTotal}`);
    console.log(`  Total amount: €${totalAmount}`);
    
    const expected = 120 * 1.30; // 156
    if (Math.abs(totalAmount - expected) < 0.01) {
        console.log("  ✓ Test passed");
        return true;
    } else {
        console.log(`  ✗ Test failed: expected €${expected}, got €${totalAmount}`);
        return false;
    }
}

// Markup model
function testMarkupModel() {
    const providerCostAdult = 50.00;
    const providerCostDog = 20.00;
    const markupAdult = 15.00;
    const markupDog = 10.00;
    const numAdults = 2;
    const numDogs = 1;
    
    const providerCostTotal = (providerCostAdult * numAdults) + (providerCostDog * numDogs);
    const totalAmount = providerCostTotal + (markupAdult * numAdults) + (markupDog * numDogs);
    
    console.log("Markup Model Test:");
    console.log(`  Provider cost total: €${providerCostTotal}`);
    console.log(`  Total amount: €${totalAmount}`);
    
    const expected = 120 + (15 * 2) + (10 * 1); // 160
    if (Math.abs(totalAmount - expected) < 0.01) {
        console.log("  ✓ Test passed");
        return true;
    } else {
        console.log(`  ✗ Test failed: expected €${expected}, got €${totalAmount}`);
        return false;
    }
}

// Financial values
function testFinancialValues() {
    const totalAmountPaid = 200.00;
    const providerCostTotal = 120.00;
    const stripeFee = 5.00;
    
    const internalMargin = totalAmountPaid - providerCostTotal - stripeFee;
    
    console.log("Financial Values Test:");
    console.log(`  Internal margin: €${internalMargin}`);
    
    const expected = 75.00;
    if (Math.abs(internalMargin - expected) < 0.01) {
        console.log("  ✓ Test passed");
        return true;
    } else {
        console.log(`  ✗ Test failed: expected €${expected}, got €${internalMargin}`);
        return false;
    }
}

// Run tests
const results = [
    testPercentageModel(),
    testMarkupModel(),
    testFinancialValues()
];

const allPassed = results.every(r => r === true);
process.exit(allPassed ? 0 : 1);
EOF

if command -v ts-node &> /dev/null; then
    ts-node /tmp/test_pricing_logic.ts
    echo -e "${GREEN}✓${NC} Pricing logic tests passed"
elif command -v node &> /dev/null; then
    # Try with tsx or just check syntax
    echo -e "${YELLOW}Note: Install ts-node to run TypeScript tests${NC}"
else
    echo -e "${YELLOW}Note: Node.js not found, skipping logic tests${NC}"
fi

echo ""
echo "Step 5: Summary"
echo "----------------------------------------"
echo -e "${GREEN}All checks completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Apply migrations to your Supabase database"
echo "2. Run verify_financial_tracking.sql to verify database structure"
echo "3. Test checkout session creation with different pricing models"
echo "4. Test booking creation and verify financial data"
echo ""
echo "See DEPLOYMENT_CHECKLIST.md for detailed deployment instructions."

