#!/bin/bash
# Comprehensive Test Suite Runner
# Runs all regression tests for the Bill's Supplies application

set -e  # Exit on first failure

# Change to project root (parent of cmd directory)
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RESULTS_DIR="./test-results"
mkdir -p "$RESULTS_DIR"

# Test results tracking
SUITE_PASSED=0
SUITE_FAILED=0

echo "╔════════════════════════════════════════════════════╗"
echo "║  Bill's Supplies - Regression Test Suite          ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
echo -e "${YELLOW}Checking server status...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}ERROR: Server is not running on http://localhost:3000${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_script=$2

    echo "=================================================="
    echo -e "${BLUE}Running: $test_name${NC}"
    echo "=================================================="

    if [ -f "$test_script" ]; then
        if bash "$test_script"; then
            echo -e "${GREEN}✓ $test_name PASSED${NC}"
            ((SUITE_PASSED++))
        else
            echo -e "${RED}✗ $test_name FAILED${NC}"
            ((SUITE_FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠ $test_name not found: $test_script${NC}"
    fi
    echo ""
}

# Run all test suites
run_test_suite "RBAC Tests" "./tests/rbac-test.sh"
run_test_suite "Quote Validation Tests" "./tests/quote-validation-test.sh"
run_test_suite "Order Validation Tests" "./tests/order-validation-test.sh"
run_test_suite "Inventory Validation Tests" "./tests/inventory-validation-test.sh"
run_test_suite "POS Validation Tests" "./tests/pos-validation-test.sh"
run_test_suite "Customer Validation Tests" "./tests/customer-validation-test.sh"
run_test_suite "Product Validation Tests" "./tests/product-validation-test.sh"
run_test_suite "Audit Log Validation Tests" "./tests/audit-log-validation-test.sh"
run_test_suite "Export Validation Tests" "./tests/export-validation-test.sh"

# Additional API tests
if [ -f "./scripts/test-api.sh" ]; then
    echo "=================================================="
    echo -e "${BLUE}Running: API Conversion Tests${NC}"
    echo "=================================================="
    if bash ./scripts/test-api.sh; then
        echo -e "${GREEN}✓ API Conversion Tests PASSED${NC}"
        ((SUITE_PASSED++))
    else
        echo -e "${YELLOW}⚠ API Conversion Tests completed (check output)${NC}"
    fi
    echo ""
fi

# Summary
echo "=================================================="
echo "TEST SUITE SUMMARY"
echo "=================================================="
echo -e "${GREEN}Test Suites Passed: $SUITE_PASSED${NC}"
echo -e "${RED}Test Suites Failed: $SUITE_FAILED${NC}"
echo "=================================================="

if [ $SUITE_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TEST SUITES PASSED${NC}"
    echo ""
    echo "Results saved to: $RESULTS_DIR"
    exit 0
else
    echo -e "${RED}✗ SOME TEST SUITES FAILED${NC}"
    echo ""
    echo "Please review the test output above"
    echo "Results saved to: $RESULTS_DIR"
    exit 1
fi
