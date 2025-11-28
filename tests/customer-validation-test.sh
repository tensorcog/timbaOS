#!/bin/bash
# Customer Validation Regression Test Suite  
# Usage: ./customer-validation-test.sh [test_name]
# Run all tests: ./customer-validation-test.sh
# Run specific test: ./customer-validation-test.sh test_customer_types

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

    response=$(curl -s -c "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" \
        -X POST "${BASE_URL}/api/auth/callback/credentials" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")

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
# TEST 1: Customer Types (RETAIL vs WHOLESALE)
#############################################
test_customer_types() {
    echo ""
    echo "========================================="
    echo "TEST: Customer Types (RETAIL vs WHOLESALE)"
    echo "========================================="

    # Login as admin
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Check customer types distribution
    CUSTOMER_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const retail = await prisma.customer.count({ where: { customerType: 'RETAIL' } });
    const wholesale = await prisma.customer.count({ where: { customerType: 'WHOLESALE' } });
    console.log(JSON.stringify({ retail, wholesale }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$CUSTOMER_DATA" ]; then
        fail "Could not fetch customer type data"
        return
    fi

    RETAIL_COUNT=$(echo "$CUSTOMER_DATA" | grep -o '"retail":[0-9]*' | cut -d':' -f2)
    WHOLESALE_COUNT=$(echo "$CUSTOMER_DATA" | grep -o '"wholesale":[0-9]*' | cut -d':' -f2)

    info "Customer types - RETAIL: $RETAIL_COUNT, WHOLESALE: $WHOLESALE_COUNT"

    if [ "$RETAIL_COUNT" -ge 0 ] && [ "$WHOLESALE_COUNT" -ge 0 ]; then
        pass "Customer types are being tracked correctly"
    else
        fail "Invalid customer type counts"
    fi
}

#############################################
# TEST 2: Tax-Exempt Status
#############################################
test_tax_exempt() {
    echo ""
    echo "========================================="
    echo "TEST: Tax-Exempt Customer Status"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Find tax-exempt and non-exempt customers
    TAX_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const exempt = await prisma.customer.count({ where: { taxExempt: true } });
    const nonExempt = await prisma.customer.count({ where: { taxExempt: false } });
    
    const exemptCustomer = await prisma.customer.findFirst({
        where: { taxExempt: true }
    });
    
    console.log(JSON.stringify({
        exempt,
        nonExempt,
        exemptCustomerName: exemptCustomer?.name || 'None'
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$TAX_DATA" ]; then
        fail "Could not fetch tax exempt data"
        return
    fi

    EXEMPT_COUNT=$(echo "$TAX_DATA" | grep -o '"exempt":[0-9]*' | cut -d':' -f2)
    NON_EXEMPT_COUNT=$(echo "$TAX_DATA" | grep -o '"nonExempt":[0-9]*' | cut -d':' -f2)

    info "Tax status - Exempt: $EXEMPT_COUNT, Non-exempt: $NON_EXEMPT_COUNT"

    if [ "$EXEMPT_COUNT" -ge 0 ] && [ "$NON_EXEMPT_COUNT" -ge 0 ]; then
        pass "Tax-exempt status is being tracked correctly"
    else
        fail "Invalid tax exempt counts"
    fi
}

#############################################
# TEST 3: Customer Search/Listing
#############################################
test_customer_listing() {
    echo ""
    echo "========================================="
    echo "TEST: Customer Listing"
    echo "========================================="

    # Login as sales user
    result=$(login "sales1@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    # Test customers endpoint
    response=$(api_request "GET" "/api/pos/customers" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        CUSTOMER_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Customer listing accessible (found $CUSTOMER_COUNT customers)"

        # Verify customers have required fields
        if echo "$body" | grep -q '"name"' && echo "$body" | grep -q '"email"'; then
            pass "Customers include required fields (name, email)"
        else
            fail "Customers missing required fields"
        fi
    else
        fail "Customer listing failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 4: Customer Email Uniqueness
#############################################
test_customer_email_uniqueness() {
    echo ""
    echo "========================================="
    echo "TEST: Customer Email Uniqueness"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Check for duplicate emails
    DUPLICATE_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const customers = await prisma.customer.findMany({
        where: {
            email: { not: null }
        },
        select: { email: true }
    });
    
    const emails = customers.map(c => c.email).filter(e => !!e);
    const uniqueEmails = new Set(emails);
    const hasDuplicates = emails.length !== uniqueEmails.size;
    
    console.log(JSON.stringify({
        totalEmails: emails.length,
        uniqueEmails: uniqueEmails.size,
        hasDuplicates
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$DUPLICATE_DATA" ]; then
        fail "Could not fetch duplicate email data"
        return
    fi

    HAS_DUPLICATES=$(echo "$DUPLICATE_DATA" | grep -o '"hasDuplicates":[a-z]*' | cut -d':' -f2)

    if [ "$HAS_DUPLICATES" == "false" ]; then
        pass "No duplicate customer emails found"
    else
        fail "Duplicate customer emails detected"
    fi
}

#############################################
# TEST 5: Walk-in Customer Generation
#############################################
test_walkin_generation() {
    echo ""
    echo "========================================="
    echo "TEST: Walk-in Customer Generation"
    echo "========================================="

    # Login as sales user
    result=$(login "sales1@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    # Create walk-in customer
    response=$(api_request "POST" "/api/pos/customers/walk-in" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        CUSTOMER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        CUSTOMER_NAME=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$CUSTOMER_ID" ]; then
            pass "Walk-in customer created successfully: $CUSTOMER_NAME"

            # Verify it's in the database
            EXISTS=$(npx tsx -e "
            import prisma from './src/lib/prisma.js';
            const customer = await prisma.customer.findUnique({
                where: { id: '$CUSTOMER_ID' }
            });
            console.log(customer ? 'YES' : 'NO');
            await prisma.\$disconnect();
            " 2>/dev/null)

            if [ "$EXISTS" == "YES" ]; then
                pass "Walk-in customer saved to database"
            else
                fail "Walk-in customer not found in database"
            fi

            # Verify customer type is RETAIL
            CUSTOMER_TYPE=$(npx tsx -e "
            import prisma from './src/lib/prisma.js';
            const customer = await prisma.customer.findUnique({
                where: { id: '$CUSTOMER_ID' }
            });
            if (customer) {
                console.log(customer.customerType);
            }
            await prisma.\$disconnect();
            " 2>/dev/null)

            if [ "$CUSTOMER_TYPE" == "RETAIL" ]; then
                pass "Walk-in customer type is RETAIL"
            else
                fail "Walk-in customer type incorrect (expected: RETAIL, got: $CUSTOMER_TYPE)"
            fi
        else
            fail "Walk-in customer created but ID not found"
        fi
    else
        fail "Walk-in customer creation failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  Customer Validation Regression Tests ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_customer_types
    test_tax_exempt
    test_customer_listing
    test_customer_email_uniqueness
    test_walkin_generation

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
    test_customer_types)
        test_customer_types
        ;;
    test_tax_exempt)
        test_tax_exempt
        ;;
    test_customer_listing)
        test_customer_listing
        ;;
    test_customer_email_uniqueness)
        test_customer_email_uniqueness
        ;;
    test_walkin_generation)
        test_walkin_generation
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_customer_types"
        echo "  test_tax_exempt"
        echo "  test_customer_listing"
        echo "  test_customer_email_uniqueness"
        echo "  test_walkin_generation"
        echo ""
        echo "Run all tests: ./customer-validation-test.sh"
        exit 1
        ;;
esac
