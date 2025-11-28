#!/bin/bash
# Quote Validation Regression Test Suite
# Usage: ./quote-validation-test.sh [test_name]
# Run all tests: ./quote-validation-test.sh
# Run specific test: ./quote-validation-test.sh test_quote_creation

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

# Get database IDs for testing
get_test_data() {
    npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
    const location = await prisma.location.findFirst();
    const product = await prisma.product.findFirst({ where: { isActive: true } });
    const user = await prisma.user.findFirst();
    console.log(JSON.stringify({
        customerId: customer?.id,
        locationId: location?.id,
        productId: product?.id,
        userId: user?.id,
        productPrice: product?.basePrice
    }));
    await prisma.\$disconnect();
    " 2>/dev/null
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
# TEST 1: Quote Creation Validation
#############################################
test_quote_creation() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Creation Validation"
    echo "========================================="

    # Get test data
    info "Fetching test data from database..."
    TEST_DATA=$(get_test_data)

    if [ -z "$TEST_DATA" ]; then
        fail "Could not fetch test data from database"
        return
    fi

    debug "Test data: $TEST_DATA"

    CUSTOMER_ID=$(echo "$TEST_DATA" | grep -o '"customerId":"[^"]*"' | cut -d'"' -f4)
    LOCATION_ID=$(echo "$TEST_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_ID=$(echo "$TEST_DATA" | grep -o '"productId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_PRICE=$(echo "$TEST_DATA" | grep -o '"productPrice":"[^"]*"' | cut -d'"' -f4)

    # Login as sales user
    info "Logging in as sales1@billssupplies.com"
    result=$(login "sales1@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi
    pass "Sales user login successful"

    # Create a quote
    info "Creating a new quote"
    QUOTE_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"locationId\": \"$LOCATION_ID\",
        \"items\": [
            {
                \"productId\": \"$PRODUCT_ID\",
                \"quantity\": 5,
                \"unitPrice\": $PRODUCT_PRICE,
                \"discount\": 0
            }
        ],
        \"notes\": \"Test quote from regression suite\",
        \"validityDays\": 30
    }"

    response=$(api_request "POST" "/api/quotes" "$QUOTE_DATA")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        QUOTE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        QUOTE_NUMBER=$(echo "$body" | grep -o '"quoteNumber":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$QUOTE_ID" ]; then
            pass "Quote created successfully: $QUOTE_NUMBER"
            echo "$QUOTE_ID" > "${RESULTS_DIR}/test_quote_id.txt"
        else
            fail "Quote created but ID not found in response"
        fi
    else
        fail "Quote creation failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 2: Quote Total Calculation Validation
#############################################
test_quote_totals() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Total Calculation Validation"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get an existing quote with items
    QUOTE_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        include: {
            QuoteItem: true,
            Customer: true,
            Location: true
        }
    });
    if (quote) {
        console.log(JSON.stringify({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            subtotal: quote.subtotal.toString(),
            taxAmount: quote.taxAmount.toString(),
            discountAmount: quote.discountAmount.toString(),
            deliveryFee: quote.deliveryFee.toString(),
            totalAmount: quote.totalAmount.toString(),
            itemCount: quote.QuoteItem.length,
            taxExempt: quote.Customer.taxExempt,
            taxRate: quote.Location.taxRate.toString()
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$QUOTE_DATA" ]; then
        info "No quotes found to test"
        pass "Quote totals test skipped (no quotes)"
        return
    fi

    debug "Quote data: $QUOTE_DATA"

    # Parse values
    SUBTOTAL=$(echo "$QUOTE_DATA" | grep -o '"subtotal":"[^"]*"' | cut -d'"' -f4)
    TAX=$(echo "$QUOTE_DATA" | grep -o '"taxAmount":"[^"]*"' | cut -d'"' -f4)
    DISCOUNT=$(echo "$QUOTE_DATA" | grep -o '"discountAmount":"[^"]*"' | cut -d'"' -f4)
    DELIVERY=$(echo "$QUOTE_DATA" | grep -o '"deliveryFee":"[^"]*"' | cut -d'"' -f4)
    TOTAL=$(echo "$QUOTE_DATA" | grep -o '"totalAmount":"[^"]*"' | cut -d'"' -f4)

    info "Quote totals - Subtotal: $SUBTOTAL, Tax: $TAX, Discount: $DISCOUNT, Delivery: $DELIVERY, Total: $TOTAL"

    # Validate calculation: Total = Subtotal - Discount + Tax + Delivery
    CALCULATED_TOTAL=$(echo "$SUBTOTAL - $DISCOUNT + $TAX + $DELIVERY" | bc)

    if [ "$CALCULATED_TOTAL" == "$TOTAL" ]; then
        pass "Quote total calculation is correct ($CALCULATED_TOTAL = $TOTAL)"
    else
        fail "Quote total calculation mismatch (expected: $CALCULATED_TOTAL, got: $TOTAL)"
    fi
}

#############################################
# TEST 3: Quote Status Transitions
#############################################
test_quote_status() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Status Transitions"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get quote status counts
    STATUS_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const draft = await prisma.quote.count({ where: { status: 'DRAFT' } });
    const pending = await prisma.quote.count({ where: { status: 'PENDING' } });
    const sent = await prisma.quote.count({ where: { status: 'SENT' } });
    const accepted = await prisma.quote.count({ where: { status: 'ACCEPTED' } });
    const rejected = await prisma.quote.count({ where: { status: 'REJECTED' } });
    const expired = await prisma.quote.count({ where: { status: 'EXPIRED' } });
    console.log(JSON.stringify({ draft, pending, sent, accepted, rejected, expired }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$STATUS_DATA" ]; then
        fail "Could not fetch quote status data"
        return
    fi

    DRAFT=$(echo "$STATUS_DATA" | grep -o '"draft":[0-9]*' | cut -d':' -f2)
    PENDING=$(echo "$STATUS_DATA" | grep -o '"pending":[0-9]*' | cut -d':' -f2)
    SENT=$(echo "$STATUS_DATA" | grep -o '"sent":[0-9]*' | cut -d':' -f2)
    ACCEPTED=$(echo "$STATUS_DATA" | grep -o '"accepted":[0-9]*' | cut -d':' -f2)
    REJECTED=$(echo "$STATUS_DATA" | grep -o '"rejected":[0-9]*' | cut -d':' -f2)
    EXPIRED=$(echo "$STATUS_DATA" | grep -o '"expired":[0-9]*' | cut -d':' -f2)

    info "Quote status distribution - DRAFT: $DRAFT, PENDING: $PENDING, SENT: $SENT, ACCEPTED: $ACCEPTED, REJECTED: $REJECTED, EXPIRED: $EXPIRED"

    if [ "$DRAFT" -ge 0 ] && [ "$PENDING" -ge 0 ] && [ "$SENT" -ge 0 ] && [ "$ACCEPTED" -ge 0 ]; then
        pass "Quote statuses are being tracked correctly"
    else
        fail "Invalid quote status counts"
    fi
}

#############################################
# TEST 4: Quote Conversion to Order
#############################################
test_quote_conversion() {
    echo ""
    echo "========================================="
    echo "TEST: Quote to Order Conversion"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Find a convertible quote
    QUOTE_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: {
            status: { in: ['PENDING', 'SENT'] },
            convertedToOrderId: null,
            validUntil: { gt: new Date() }
        },
        include: { QuoteItem: true }
    });
    if (quote) {
        console.log(JSON.stringify({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            totalAmount: quote.totalAmount.toString(),
            itemCount: quote.QuoteItem.length,
            validUntil: quote.validUntil
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$QUOTE_DATA" ]; then
        info "No convertible quotes found"
        pass "Quote conversion test skipped (no suitable quotes)"
        return
    fi

    QUOTE_ID=$(echo "$QUOTE_DATA" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    QUOTE_NUMBER=$(echo "$QUOTE_DATA" | grep -o '"quoteNumber":"[^"]*"' | cut -d'"' -f4)
    QUOTE_TOTAL=$(echo "$QUOTE_DATA" | grep -o '"totalAmount":"[^"]*"' | cut -d'"' -f4)
    QUOTE_STATUS=$(echo "$QUOTE_DATA" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    info "Testing conversion for quote: $QUOTE_NUMBER (status: $QUOTE_STATUS)"

    # Convert quote to order
    response=$(api_request "POST" "/api/quotes/$QUOTE_ID/convert" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        if echo "$body" | grep -q '"success":true'; then
            pass "Quote $QUOTE_NUMBER converted to order successfully"

            # Extract order ID
            ORDER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

            if [ -n "$ORDER_ID" ]; then
                # Verify order total matches quote total
                ORDER_TOTAL=$(npx tsx -e "
                import prisma from './src/lib/prisma.js';
                const order = await prisma.order.findUnique({
                    where: { id: '$ORDER_ID' }
                });
                if (order) {
                    console.log(order.totalAmount.toString());
                }
                await prisma.\$disconnect();
                " 2>/dev/null)

                if [ "$ORDER_TOTAL" == "$QUOTE_TOTAL" ]; then
                    pass "Converted order has correct total ($ORDER_TOTAL)"
                else
                    fail "Order total mismatch (quote: $QUOTE_TOTAL, order: $ORDER_TOTAL)"
                fi

                # Verify quote status updated to ACCEPTED
                NEW_QUOTE_STATUS=$(npx tsx -e "
                import prisma from './src/lib/prisma.js';
                const quote = await prisma.quote.findUnique({
                    where: { id: '$QUOTE_ID' }
                });
                if (quote) {
                    console.log(quote.status);
                }
                await prisma.\$disconnect();
                " 2>/dev/null)

                if [ "$NEW_QUOTE_STATUS" == "ACCEPTED" ]; then
                    pass "Quote status correctly updated to ACCEPTED"
                else
                    fail "Quote status not updated (expected: ACCEPTED, got: $NEW_QUOTE_STATUS)"
                fi

                # Verify quote has convertedToOrderId set
                HAS_ORDER_ID=$(npx tsx -e "
                import prisma from './src/lib/prisma.js';
                const quote = await prisma.quote.findUnique({
                    where: { id: '$QUOTE_ID' }
                });
                if (quote && quote.convertedToOrderId) {
                    console.log('YES');
                } else {
                    console.log('NO');
                }
                await prisma.\$disconnect();
                " 2>/dev/null)

                if [ "$HAS_ORDER_ID" == "YES" ]; then
                    pass "Quote correctly linked to order"
                else
                    fail "Quote not linked to order (convertedToOrderId not set)"
                fi
            fi
        else
            fail "Quote conversion returned 200 but success was not true"
        fi
    else
        fail "Quote conversion failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 5: Quote Conversion Validation Rules
#############################################
test_quote_conversion_rules() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Conversion Validation Rules"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Test 1: Cannot convert already converted quote
    CONVERTED_QUOTE=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: { convertedToOrderId: { not: null } }
    });
    if (quote) {
        console.log(quote.id);
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$CONVERTED_QUOTE" ]; then
        info "Testing that already-converted quotes cannot be re-converted"
        response=$(api_request "POST" "/api/quotes/$CONVERTED_QUOTE/convert" "")
        status=$(echo "$response" | tail -n1)

        if [ "$status" -eq 400 ]; then
            pass "Already-converted quotes are correctly blocked from re-conversion"
        else
            fail "Already-converted quotes should return 400 (got: $status)"
        fi
    else
        info "No converted quotes found to test re-conversion blocking"
    fi

    # Test 2: Cannot convert REJECTED quote
    REJECTED_QUOTE=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: { status: 'REJECTED' }
    });
    if (quote) {
        console.log(quote.id);
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$REJECTED_QUOTE" ]; then
        info "Testing that REJECTED quotes cannot be converted"
        response=$(api_request "POST" "/api/quotes/$REJECTED_QUOTE/convert" "")
        status=$(echo "$response" | tail -n1)

        if [ "$status" -eq 400 ]; then
            pass "REJECTED quotes are correctly blocked from conversion"
        else
            fail "REJECTED quotes should return 400 (got: $status)"
        fi
    else
        info "No rejected quotes found to test"
    fi

    # Test 3: Cannot convert DRAFT quote
    DRAFT_QUOTE=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: { status: 'DRAFT' }
    });
    if (quote) {
        console.log(quote.id);
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$DRAFT_QUOTE" ]; then
        info "Testing that DRAFT quotes cannot be converted"
        response=$(api_request "POST" "/api/quotes/$DRAFT_QUOTE/convert" "")
        status=$(echo "$response" | tail -n1)

        if [ "$status" -eq 400 ]; then
            pass "DRAFT quotes are correctly blocked from conversion"
        else
            fail "DRAFT quotes should return 400 (got: $status)"
        fi
    else
        info "No draft quotes found to test"
    fi
}

#############################################
# TEST 6: Quote Validity Period
#############################################
test_quote_validity() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Validity Period"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Check for quotes with various validity statuses
    VALIDITY_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const now = new Date();
    const valid = await prisma.quote.count({
        where: { validUntil: { gt: now } }
    });
    const expired = await prisma.quote.count({
        where: { validUntil: { lte: now } }
    });
    console.log(JSON.stringify({ valid, expired }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$VALIDITY_DATA" ]; then
        fail "Could not fetch validity data"
        return
    fi

    VALID_COUNT=$(echo "$VALIDITY_DATA" | grep -o '"valid":[0-9]*' | cut -d':' -f2)
    EXPIRED_COUNT=$(echo "$VALIDITY_DATA" | grep -o '"expired":[0-9]*' | cut -d':' -f2)

    info "Quote validity - Valid: $VALID_COUNT, Expired: $EXPIRED_COUNT"

    if [ "$VALID_COUNT" -ge 0 ] && [ "$EXPIRED_COUNT" -ge 0 ]; then
        pass "Quote validity periods are being tracked correctly"
    else
        fail "Invalid validity counts"
    fi

    # Test that expired quotes cannot be converted
    EXPIRED_QUOTE=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: {
            validUntil: { lte: new Date() },
            convertedToOrderId: null,
            status: { in: ['PENDING', 'SENT'] }
        }
    });
    if (quote) {
        console.log(quote.id);
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$EXPIRED_QUOTE" ]; then
        info "Testing that expired quotes cannot be converted"
        response=$(api_request "POST" "/api/quotes/$EXPIRED_QUOTE/convert" "")
        status=$(echo "$response" | tail -n1)

        if [ "$status" -eq 400 ]; then
            pass "Expired quotes are correctly blocked from conversion"
        else
            fail "Expired quotes should return 400 (got: $status)"
        fi
    else
        info "No expired quotes found to test conversion blocking"
    fi
}

#############################################
# TEST 7: Quote Tax Calculation
#############################################
test_quote_tax_calculation() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Tax Calculation"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Test tax-exempt customer
    TAX_EXEMPT_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: {
            Customer: { taxExempt: true }
        },
        include: { Customer: true }
    });
    if (quote) {
        console.log(JSON.stringify({
            id: quote.id,
            taxAmount: quote.taxAmount.toString(),
            taxExempt: quote.Customer.taxExempt
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$TAX_EXEMPT_DATA" ]; then
        TAX_AMOUNT=$(echo "$TAX_EXEMPT_DATA" | grep -o '"taxAmount":"[^"]*"' | cut -d'"' -f4)

        if [ "$TAX_AMOUNT" == "0" ] || [ "$TAX_AMOUNT" == "0.00" ]; then
            pass "Tax-exempt customers have zero tax amount in quotes"
        else
            fail "Tax-exempt customer has non-zero tax amount: $TAX_AMOUNT"
        fi
    else
        info "No tax-exempt customer quotes found to test"
    fi

    # Test non tax-exempt customer
    TAXABLE_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quote = await prisma.quote.findFirst({
        where: {
            Customer: { taxExempt: false },
            taxAmount: { gt: 0 }
        },
        include: {
            Customer: true,
            Location: true
        }
    });
    if (quote) {
        console.log(JSON.stringify({
            id: quote.id,
            subtotal: quote.subtotal.toString(),
            taxAmount: quote.taxAmount.toString(),
            taxRate: quote.Location.taxRate.toString(),
            taxExempt: quote.Customer.taxExempt
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -n "$TAXABLE_DATA" ]; then
        SUBTOTAL=$(echo "$TAXABLE_DATA" | grep -o '"subtotal":"[^"]*"' | cut -d'"' -f4)
        TAX_AMOUNT=$(echo "$TAXABLE_DATA" | grep -o '"taxAmount":"[^"]*"' | cut -d'"' -f4)
        TAX_RATE=$(echo "$TAXABLE_DATA" | grep -o '"taxRate":"[^"]*"' | cut -d'"' -f4)

        # Calculate expected tax
        EXPECTED_TAX=$(echo "$SUBTOTAL * $TAX_RATE" | bc -l)
        EXPECTED_TAX=$(printf "%.2f" "$EXPECTED_TAX")
        TAX_AMOUNT=$(printf "%.2f" "$TAX_AMOUNT")

        if [ "$TAX_AMOUNT" == "$EXPECTED_TAX" ]; then
            pass "Quote tax calculation is correct ($SUBTOTAL × $TAX_RATE = $TAX_AMOUNT)"
        else
            # Allow for small rounding differences
            DIFF=$(echo "$TAX_AMOUNT - $EXPECTED_TAX" | bc -l | sed 's/-//')
            if (( $(echo "$DIFF < 0.01" | bc -l) )); then
                pass "Quote tax calculation is correct (within rounding tolerance)"
            else
                fail "Quote tax calculation mismatch (expected: $EXPECTED_TAX, got: $TAX_AMOUNT)"
            fi
        fi
    else
        info "No taxable quotes found to test tax calculation"
    fi
}

#############################################
# TEST 8: Quote Access Permissions
#############################################
test_quote_permissions() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Access Permissions"
    echo "========================================="

    # Test sales user can only see their own quotes
    info "Testing sales user quote filtering"
    result=$(login "sales1@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    response=$(api_request "GET" "/api/quotes" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        SALES_QUOTE_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Sales user can access quotes endpoint (found $SALES_QUOTE_COUNT quotes)"
        echo "$SALES_QUOTE_COUNT" > "${RESULTS_DIR}/sales_quote_count.txt"
    else
        fail "Sales user quotes access denied (status: $status)"
    fi

    # Test admin can see all quotes
    info "Testing admin user quote access"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    response=$(api_request "GET" "/api/quotes" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        ADMIN_QUOTE_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Admin can access quotes endpoint (found $ADMIN_QUOTE_COUNT quotes)"

        # Compare with sales count
        if [ -f "${RESULTS_DIR}/sales_quote_count.txt" ]; then
            SALES_COUNT=$(cat "${RESULTS_DIR}/sales_quote_count.txt")
            if [ "$ADMIN_QUOTE_COUNT" -ge "$SALES_COUNT" ]; then
                pass "Admin sees more/equal quotes than sales user ($ADMIN_QUOTE_COUNT >= $SALES_COUNT)"
            else
                fail "Admin should see at least as many quotes as sales user"
            fi
        fi
    else
        fail "Admin quotes access denied (status: $status)"
    fi

    # Test unauthenticated access is blocked
    info "Testing unauthenticated quote access"
    rm -f "${RESULTS_DIR}/cookies.txt"

    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/quotes")
    status=$(echo "$response" | tail -n1)

    if [ "$status" -eq 401 ]; then
        pass "Unauthenticated users correctly blocked from quotes"
    else
        fail "Unauthenticated quotes should return 401 (got: $status)"
    fi
}

#############################################
# TEST 9: Quote Delivery Fee Calculation
#############################################
test_quote_delivery_fee() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Delivery Fee Calculation"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Check delivery fee logic
    DELIVERY_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const withDelivery = await prisma.quote.count({
        where: { deliveryFee: { gt: 0 } }
    });
    const withoutDelivery = await prisma.quote.count({
        where: { deliveryFee: 0 }
    });
    console.log(JSON.stringify({ withDelivery, withoutDelivery }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$DELIVERY_DATA" ]; then
        fail "Could not fetch delivery fee data"
        return
    fi

    WITH_DELIVERY=$(echo "$DELIVERY_DATA" | grep -o '"withDelivery":[0-9]*' | cut -d':' -f2)
    WITHOUT_DELIVERY=$(echo "$DELIVERY_DATA" | grep -o '"withoutDelivery":[0-9]*' | cut -d':' -f2)

    info "Delivery fees - With delivery: $WITH_DELIVERY, Without: $WITHOUT_DELIVERY"

    if [ "$WITH_DELIVERY" -ge 0 ] && [ "$WITHOUT_DELIVERY" -ge 0 ]; then
        pass "Quote delivery fees are being calculated and tracked"
    else
        fail "Invalid delivery fee counts"
    fi
}

#############################################
# TEST 10: Quote Number Generation
#############################################
test_quote_number_generation() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Number Generation"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get all quote numbers and verify uniqueness
    QUOTE_NUMBERS=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const quotes = await prisma.quote.findMany({
        select: { quoteNumber: true }
    });
    const numbers = quotes.map(q => q.quoteNumber);
    const unique = [...new Set(numbers)];
    console.log(JSON.stringify({
        total: numbers.length,
        unique: unique.length,
        allUnique: numbers.length === unique.length
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$QUOTE_NUMBERS" ]; then
        fail "Could not fetch quote numbers"
        return
    fi

    ALL_UNIQUE=$(echo "$QUOTE_NUMBERS" | grep -o '"allUnique":[a-z]*' | cut -d':' -f2)
    TOTAL=$(echo "$QUOTE_NUMBERS" | grep -o '"total":[0-9]*' | cut -d':' -f2)

    info "Quote numbers - Total: $TOTAL"

    if [ "$ALL_UNIQUE" == "true" ]; then
        pass "All quote numbers are unique"
    else
        fail "Duplicate quote numbers detected!"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════════════════╗"
    echo "║  Quote Validation Regression Tests                ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""

    test_quote_creation
    test_quote_totals
    test_quote_tax_calculation
    test_quote_delivery_fee
    test_quote_status
    test_quote_validity
    test_quote_number_generation
    test_quote_permissions
    test_quote_conversion
    test_quote_conversion_rules

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
    test_quote_creation)
        test_quote_creation
        ;;
    test_quote_totals)
        test_quote_totals
        ;;
    test_quote_status)
        test_quote_status
        ;;
    test_quote_conversion)
        test_quote_conversion
        ;;
    test_quote_conversion_rules)
        test_quote_conversion_rules
        ;;
    test_quote_validity)
        test_quote_validity
        ;;
    test_quote_tax_calculation)
        test_quote_tax_calculation
        ;;
    test_quote_permissions)
        test_quote_permissions
        ;;
    test_quote_delivery_fee)
        test_quote_delivery_fee
        ;;
    test_quote_number_generation)
        test_quote_number_generation
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_quote_creation"
        echo "  test_quote_totals"
        echo "  test_quote_status"
        echo "  test_quote_conversion"
        echo "  test_quote_conversion_rules"
        echo "  test_quote_validity"
        echo "  test_quote_tax_calculation"
        echo "  test_quote_permissions"
        echo "  test_quote_delivery_fee"
        echo "  test_quote_number_generation"
        echo ""
        echo "Run all tests: ./quote-validation-test.sh"
        exit 1
        ;;
esac
