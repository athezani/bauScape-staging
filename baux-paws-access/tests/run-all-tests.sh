#!/bin/bash

# ============================================
# Script per eseguire tutti i test
# ============================================

set -e

echo "=========================================="
echo "🧪 RUNNING ALL TESTS"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test 1: Database Migration Tests
echo ""
echo "📦 TEST SUITE 1: Database Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Note: Database migration tests require database connection${NC}"
echo -e "${YELLOW}Run manually with: psql -f tests/quotation-migration.test.sql${NC}"
echo ""

# Test 2: create-checkout-session Tests
run_test "create-checkout-session Unit Tests" \
    "deno test --allow-all tests/create-checkout-session.test.ts"

# Test 3: stripe-webhook Tests
run_test "stripe-webhook Reconciliation Tests" \
    "deno test --allow-all tests/stripe-webhook-reconciliation.test.ts"

# Test 4: Odoo Webhook Tests
run_test "Odoo Webhook Metadata Tests" \
    "deno test --allow-all tests/odoo-webhook-metadata.test.ts"

# Test 5: E2E Tests
run_test "E2E Complete Checkout Flow (20 scenarios)" \
    "deno test --allow-all tests/e2e-checkout-flow.test.ts"

# Summary
echo ""
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: $FAILED_TESTS${NC}"
fi

SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo "Success rate: ${SUCCESS_RATE}%"
echo "=========================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi

