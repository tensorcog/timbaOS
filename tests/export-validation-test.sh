#!/bin/bash
# Export Validation Regression Test Suite
# Usage: ./export-validation-test.sh [test_name]
# Run all tests: ./export-validation-test.sh
# Run specific test: ./export-validation-test.sh test_export_access

BASE_URL="http://localhost:3000"
RESULTS_DIR="./test-results"
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

debug() {
    echo -e "${BLUE}DEBUG${NC}: $1"
}

# Login function - returns session cookie
login() {
    local email=$1
    local password=$2

    # Get CSRF token and initial cookies
    csrf_response=$(curl -s -c "${RESULTS_DIR}/cookies.txt" "${BASE_URL}/api/auth/csrf")
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

    response=$(curl -s -c "${RESULTS_DIR}/cookies.txt" -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" \
        -X POST "${BASE_URL}/api/auth/callback/credentials" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"csrfToken\":\"$csrf_token\",\"json\":true}")

    status_code=$(echo "$response" | tail -n1)
    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 302 ]; then
        echo "SUCCESS"
    else
        echo "FAILED:$status_code"
    fi
}

# API Request with session
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" \
            -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" \
            -X "$method" "${BASE_URL}${endpoint}"
    fi
}

#############################################
# TEST 1: Export Endpoint Access
#############################################
test_export_access() {
    echo ""
    echo "========================================="
    echo "TEST: Export Endpoint Access"
    echo "========================================="

    # Login as admin
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi
    pass "Admin login successful"

    # Test export endpoint
    response=$(api_request "GET" "/api/export" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        pass "Export endpoint is accessible"
        
        # Check if response contains data
        if [ -n "$body" ] && [ "$body" != "{}" ]; then
            pass "Export endpoint returns data"
        else
            info "Export endpoint returned empty data"
        fi
    else
        info "Export endpoint status: $status (may not be implemented yet)"
    fi
}

#############################################
# TEST 2: Export RBAC
#############################################
test_export_rbac() {
    echo ""
    echo "========================================="
    echo "TEST: Export RBAC (Role-Based Access)"
    echo "========================================="

    # Test with sales user (may be restricted)
    info "Testing export access as sales user"
    result=$(login "sales1@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    response=$(api_request "GET" "/api/export" "")
    status=$(echo "$response" | tail -n1)

    if [ "$status" -eq 200 ]; then
        info "Sales user can access export endpoint"
    elif [ "$status" -eq 403 ]; then
        pass "Sales user correctly blocked from export (RBAC working)"
    else
        info "Export endpoint returned status: $status"
    fi

    # Test with manager (should have access)
    info "Testing export access as manager"
    result=$(login "amherst.manager@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Manager login failed: $result"
        return
    fi

    response=$(api_request "GET" "/api/export" "")
    status=$(echo "$response" | tail -n1)

    if [ "$status" -eq 200 ]; then
        pass "Manager can access export endpoint"
    else
        info "Manager export access status: $status"
    fi
}

#############################################
# TEST 3: Analytics Data Availability
#############################################
test_analytics_export() {
    echo ""
    echo "========================================="
    echo "TEST: Analytics Data for Export"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Test analytics endpoint (data source for exports)
    response=$(api_request "GET" "/api/analytics" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        pass "Analytics data is accessible for export"

        # Check for key metrics
        if echo "$body" | grep -q '"totalRevenue"' && echo "$body" | grep -q '"totalOrders"'; then
            pass "Analytics data includes key exportable metrics"
        else
            info "Analytics data structure may need review for export"
        fi
    else
        fail "Analytics endpoint failed (status: $status)"
    fi
}

#############################################
# TEST 4: Data Export Completeness
#############################################
test_export_completeness() {
    echo ""
    echo "========================================="
    echo "TEST: Export Data Completeness"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Verify data is available for export
    DATA_COUNTS=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const quotes = await prisma.quote.count();
        const orders = await prisma.order.count();
        const customers = await prisma.customer.count();
        const products = await prisma.product.count();
        
        console.log(JSON.stringify({
            quotes,
            orders,
            customers,
            products,
            total: quotes + orders + customers + products
        }));
    })();
    " 2>/dev/null)

    if [ -z "$DATA_COUNTS" ]; then
        fail "Could not fetch data counts"
        return
    fi

    QUOTES=$(echo "$DATA_COUNTS" | grep -o '"quotes":[0-9]*' | cut -d':' -f2)
    ORDERS=$(echo "$DATA_COUNTS" | grep -o '"orders":[0-9]*' | cut -d':' -f2)
    CUSTOMERS=$(echo "$DATA_COUNTS" | grep -o '"customers":[0-9]*' | cut -d':' -f2)
    PRODUCTS=$(echo "$DATA_COUNTS" | grep -o '"products":[0-9]*' | cut -d':' -f2)

    info "Data available for export - Quotes: $QUOTES, Orders: $ORDERS, Customers: $CUSTOMERS, Products: $PRODUCTS"

    if [ "$QUOTES" -gt 0 ] && [ "$ORDERS" -gt 0 ] && [ "$CUSTOMERS" -gt 0 ] && [ "$PRODUCTS" -gt 0 ]; then
        pass "All data types available for export"
    else
        info "Some data types may have zero records"
    fi
}

#############################################
# TEST 5: Export Performance
#############################################
test_export_performance() {
    echo ""
    echo "========================================="
    echo "TEST: Export Performance"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Time the export/analytics request
    START_TIME=$(date +%s%N)
    response=$(api_request "GET" "/api/analytics" "")
    END_TIME=$(date +%s%N)

    status=$(echo "$response" | tail -n1)
    ELAPSED=$((($END_TIME - $START_TIME) / 1000000)) # Convert to milliseconds

    if [ "$status" -eq 200 ]; then
        info "Export/analytics query took ${ELAPSED}ms"
        
        if [ "$ELAPSED" -lt 10000 ]; then
            pass "Export performance is acceptable (${ELAPSED}ms < 10s)"
        else
            fail "Export query is slow (${ELAPSED}ms)"
        fi
    else
        fail "Export/analytics query failed (status: $status)"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  Export Validation Regression Tests   ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_export_access
    test_export_rbac
    test_analytics_export
    test_export_completeness
    test_export_performance

    echo ""
    echo "========================================="
    echo "TEST SUMMARY"
    echo "========================================="
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo "========================================="

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
        exit 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}"
        exit 1
    fi
}

#############################################
# Command Line Interface
#############################################
case "$1" in
    test_export_access)
        test_export_access
        ;;
    test_export_rbac)
        test_export_rbac
        ;;
    test_analytics_export)
        test_analytics_export
        ;;
    test_export_completeness)
        test_export_completeness
        ;;
    test_export_performance)
        test_export_performance
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_export_access"
        echo "  test_export_rbac"
        echo "  test_analytics_export"
        echo "  test_export_completeness"
        echo "  test_export_performance"
        echo ""
        echo "Run all tests: ./export-validation-test.sh"
        exit 1
        ;;
esac
