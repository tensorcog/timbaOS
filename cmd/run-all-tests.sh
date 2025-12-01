#!/bin/bash
# Comprehensive Test Suite Runner
# Runs all regression tests for the timbaOS application

# Change to project root (parent of cmd directory)
cd "$(dirname "$0")/.."

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/test-run-$TIMESTAMP.log"

mkdir -p "$RESULTS_DIR"

# Colors for output (only if outputting to a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Test results tracking
SUITE_PASSED=0
SUITE_FAILED=0

# Helper function to log and display
log_msg() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_msg "╔════════════════════════════════════════════════════╗"
log_msg "║  timbaOS - Regression Test Suite                  ║"
log_msg "╚════════════════════════════════════════════════════╝"
log_msg ""
log_msg "Started at: $(date)"
log_msg "Server URL: $SERVER_URL"
log_msg "Log file: $LOG_FILE"
log_msg ""

# Check if server is running
log_msg "${YELLOW}Checking server status...${NC}"
if ! curl -s "$SERVER_URL" > /dev/null; then
    log_msg "${RED}ERROR: Server is not running on $SERVER_URL${NC}"
    log_msg "Please start the server with: npm run dev"
    log_msg "Or set SERVER_URL environment variable to the correct URL"
    exit 1
fi
log_msg "${GREEN}✓ Server is running${NC}"
log_msg ""

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_script=$2

    log_msg "=================================================="
    log_msg "${BLUE}Running: $test_name${NC}"
    log_msg "=================================================="

    if [ -f "$test_script" ]; then
        # Run test and capture output - use tee to show real-time output AND log
        if bash "$test_script" 2>&1 | tee -a "$LOG_FILE"; then
            log_msg "${GREEN}✓ $test_name PASSED${NC}"
            ((SUITE_PASSED++))
            return 0
        else
            log_msg "${RED}✗ $test_name FAILED${NC}"
            ((SUITE_FAILED++))
            return 1
        fi
    else
        log_msg "${YELLOW}⚠ $test_name not found: $test_script${NC}"
        return 0
    fi
    log_msg ""
}

# Define test suites as an array - all tests now implemented
TEST_SUITES=(
    "RBAC Tests:./tests/rbac-test.sh"
    "Quote Validation Tests:./tests/quote-validation-test.sh"
    "Order Validation Tests:./tests/order-validation-test.sh"
    "Inventory Validation Tests:./tests/inventory-validation-test.sh"
    "POS Validation Tests:./tests/pos-validation-test.sh"
    "Customer Validation Tests:./tests/customer-validation-test.sh"
    "Product Validation Tests:./tests/product-validation-test.sh"
    "Analytics/Export/Audit Tests:./tests/analytics-export-audit-test.sh"
)

# Run all test suites from array
for test in "${TEST_SUITES[@]}"; do
    IFS=':' read -r name script <<< "$test"
    run_test_suite "$name" "$script"
done

# Additional API tests - handle consistently with other tests
if [ -f "./scripts/test-api.sh" ]; then
    run_test_suite "API Conversion Tests" "./scripts/test-api.sh"
fi

if [ -f "./scripts/test-schedule.sh" ]; then
    run_test_suite "Schedule API Tests" "./scripts/test-schedule.sh"
fi

if [ -f "./scripts/test-shipments.sh" ]; then
    run_test_suite "Shipment CRUD Tests" "./scripts/test-shipments.sh"
fi

# Summary
log_msg ""
log_msg "=================================================="
log_msg "TEST SUITE SUMMARY"
log_msg "=================================================="
log_msg "${GREEN}Test Suites Passed: $SUITE_PASSED${NC}"
log_msg "${RED}Test Suites Failed: $SUITE_FAILED${NC}"
log_msg "=================================================="
log_msg "Completed at: $(date)"
log_msg ""

if [ $SUITE_FAILED -eq 0 ]; then
    log_msg "${GREEN}✓ ALL TEST SUITES PASSED${NC}"
    log_msg ""
    log_msg "Full results saved to: $LOG_FILE"
    exit 0
else
    log_msg "${RED}✗ SOME TEST SUITES FAILED${NC}"
    log_msg ""
    log_msg "Please review the test output above or check: $LOG_FILE"
    exit 1
fi
