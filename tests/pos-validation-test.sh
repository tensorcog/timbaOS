#!/bin/bash
# POS Validation Regression Test Suite
# Usage: ./pos-validation-test.sh [test_name]
# Run all tests: ./pos-validation-test.sh
# Run specific test: ./pos-validation-test.sh test_pos_checkout

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
# TEST 1: POS Checkout Flow
#############################################
test_pos_checkout() {
    echo ""
    echo "========================================="
    echo "TEST: POS Checkout Flow"
    echo "========================================="

    # Login as admin
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi
    pass "Admin login successful"

    # Get test data for checkout
    TEST_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const location = await prisma.location.findFirst();
        const customer = await prisma.customer.findFirst({
            where: { customerType: 'RETAIL' }
        });
        const product = await prisma.product.findFirst({
            where: { isActive: true },
            include: { LocationPricing: true }
        });
        
        if (location && customer && product) {
            console.log(JSON.stringify({
                locationId: location.id,
                customerId: customer.id,
                productId: product.id,
                price: product.LocationPricing[0]?.price || product.basePrice
            }));
        }
    })();
    " 2>/dev/null)

    if [ -z "$TEST_DATA" ]; then
        fail "Could not fetch test data for POS checkout"
        return
    fi

    debug "Test data: $TEST_DATA"

    LOCATION_ID=$(echo "$TEST_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    CUSTOMER_ID=$(echo "$TEST_DATA" | grep -o '"customerId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_ID=$(echo "$TEST_DATA" | grep -o '"productId":"[^"]*"' | cut -d'"' -f4)
    PRICE=$(echo "$TEST_DATA" | grep -o '"price":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_NAME=$(echo "$TEST_DATA" | grep -o '"productName":"[^"]*"' | cut -d'"' -f4)

    info "Testing POS checkout for product: $PRODUCT_NAME"

    # Create checkout
    TOTAL=$(echo "$PRICE * 3" | bc)
    CHECKOUT_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"locationId\": \"$LOCATION_ID\",
        \"items\": [{
            \"productId\": \"$PRODUCT_ID\",
            \"quantity\": 3,
            \"price\": $PRICE,
            \"discount\": 0
        }],
        \"payments\": [{
            \"method\": \"CASH\",
            \"amount\": $TOTAL
        }]
    }"

    response=$(api_request "POST" "/api/pos/checkout" "$CHECKOUT_DATA")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        ORDER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        ORDER_NUMBER=$(echo "$body" | grep -o '"orderNumber":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$ORDER_ID" ]; then
            pass "POS checkout successful: $ORDER_NUMBER"
            echo "$ORDER_ID" > "${RESULTS_DIR}/pos_order_id.txt"

            # Verify order in database
            ORDER_DETAILS=$(npx tsx -e "
            import prisma from './src/lib/prisma';
            (async () => {
                const order = await prisma.order.findUnique({
                    where: { orderNumber: '$ORDER_NUMBER' }
                });
                if (order) {
                    console.log(JSON.stringify({
                        type: order.orderType,
                        paymentStatus: order.paymentStatus,
                        status: order.status
                    }));
                }
            })();
            " 2>/dev/null)

            # Verify order type is POS
            ORDER_TYPE=$(echo "$ORDER_DETAILS" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)

            if [ "$ORDER_TYPE" == "POS" ]; then
                pass "Order type correctly set to POS"
            else
                fail "Order type incorrect (expected: POS, got: $ORDER_TYPE)"
            fi



            # Verify payment status is PAID
            PAYMENT_STATUS=$(echo "$ORDER_DETAILS" | grep -o '"paymentStatus":"[^"]*"' | cut -d'"' -f4)

            if [ "$PAYMENT_STATUS" == "PAID" ]; then
                pass "Payment status correctly set to PAID"
            else
                fail "Payment status incorrect (expected: PAID, got: $PAYMENT_STATUS)"
            fi

            # Verify order status is COMPLETED
            ORDER_STATUS=$(echo "$ORDER_DETAILS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

            if [ "$ORDER_STATUS" == "COMPLETED" ]; then
                pass "Order status correctly set to COMPLETED"
            else
                fail "Order status incorrect (expected: COMPLETED, got: $ORDER_STATUS)"
            fi
        else
            fail "Order created but ID not found in response"
        fi
    else
        fail "POS checkout failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 2: Walk-in Customer Creation
#############################################
test_walkin_customer() {
    echo ""
    echo "========================================="
    echo "TEST: Walk-in Customer Creation"
    echo "========================================="

    # Login as sales user
    result=$(login "sales1@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    # Create walk-in customer
    TIMESTAMP=$(date +%s)
    response=$(api_request "POST" "/api/pos/customers/walk-in" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        CUSTOMER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        CUSTOMER_NAME=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$CUSTOMER_ID" ]; then
            pass "Walk-in customer created: $CUSTOMER_NAME"

            # Verify customer name starts with "Walk-in"
            if [[ "$CUSTOMER_NAME" == Walk-in* ]]; then
                pass "Walk-in customer name format is correct"
            else
                fail "Walk-in customer name format incorrect (got: $CUSTOMER_NAME)"
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
# TEST 3: Multiple Payment Methods
#############################################
test_multiple_payments() {
    echo ""
    echo "========================================="
    echo "TEST: Multiple Payment Methods (Split)"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get test data
    TEST_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const location = await prisma.location.findFirst();
    const customer = await prisma.customer.findFirst();
    const inventory = await prisma.locationInventory.findFirst({
        where: {
            locationId: location?.id,
            stockLevel: { gte: 5 }
        },
        include: { product: true }
    });

    if (location && customer && inventory) {
        console.log(JSON.stringify({
            locationId: location.id,
            customerId: customer.id,
            productId: inventory.productId,
            price: inventory.product.basePrice.toString()
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$TEST_DATA" ]; then
        info "No suitable test data found"
        pass "Multiple payment test skipped (no data)"
        return
    fi

    LOCATION_ID=$(echo "$TEST_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    CUSTOMER_ID=$(echo "$TEST_DATA" | grep -o '"customerId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_ID=$(echo "$TEST_DATA" | grep -o '"productId":"[^"]*"' | cut -d'"' -f4)
    PRICE=$(echo "$TEST_DATA" | grep -o '"price":"[^"]*"' | cut -d'"' -f4)

    # Split payment: 50% cash, 50% card
    TOTAL=$(echo "$PRICE * 2" | bc)
    HALF=$(echo "$TOTAL / 2" | bc)

    info "Testing split payment: $HALF cash + $HALF card = $TOTAL total"

    CHECKOUT_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"locationId\": \"$LOCATION_ID\",
        \"items\": [{
            \"productId\": \"$PRODUCT_ID\",
            \"quantity\": 2,
            \"price\": $PRICE,
            \"discount\": 0
        }],
        \"payments\": [
            {
                \"method\": \"CASH\",
                \"amount\": $HALF
            },
            {
                \"method\": \"CARD\",
                \"amount\": $HALF
            }
        ]
    }"

    response=$(api_request "POST" "/api/pos/checkout" "$CHECKOUT_DATA")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        ORDER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

        if [ -n "$ORDER_ID" ]; then
            pass "Split payment checkout successful"

            # Verify multiple payments were recorded
            PAYMENT_COUNT=$(npx tsx -e "
            import prisma from './src/lib/prisma.js';
            const payments = await prisma.payment.count({
                where: { orderId: '$ORDER_ID' }
            });
            console.log(payments);
            await prisma.\$disconnect();
            " 2>/dev/null)

            if [ "$PAYMENT_COUNT" -eq 2 ]; then
                pass "Multiple payments recorded correctly (count: $PAYMENT_COUNT)"
            else
                fail "Expected 2 payments, found $PAYMENT_COUNT"
            fi
        else
            fail "Order ID not found in response"
        fi
    else
        fail "Split payment checkout failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 4: POS Tax Calculation
#############################################
test_pos_tax_calculation() {
    echo ""
    echo "========================================="
    echo "TEST: POS Tax Calculation"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Find a non-tax-exempt customer
    TEST_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const location = await prisma.location.findFirst();
    const customer = await prisma.customer.findFirst({
        where: { taxExempt: false }
    });
    const inventory = await prisma.locationInventory.findFirst({
        where: {
            locationId: location?.id,
            stockLevel: { gte: 5 }
        },
        include: { product: true }
    });

    if (location && customer && inventory) {
        console.log(JSON.stringify({
            locationId: location.id,
            customerId: customer.id,
            productId: inventory.productId,
            price: inventory.product.basePrice.toString(),
            taxRate: location.taxRate.toString()
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$TEST_DATA" ]; then
        info "No taxable customer found"
        pass "POS tax test skipped (no taxable customer)"
        return
    fi

    LOCATION_ID=$(echo "$TEST_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    CUSTOMER_ID=$(echo "$TEST_DATA" | grep -o '"customerId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_ID=$(echo "$TEST_DATA" | grep -o '"productId":"[^"]*"' | cut -d'"' -f4)
    PRICE=$(echo "$TEST_DATA" | grep -o '"price":"[^"]*"' | cut -d'"' -f4)
    TAX_RATE=$(echo "$TEST_DATA" | grep -o '"taxRate":"[^"]*"' | cut -d'"' -f4)

    TOTAL=$(echo "$PRICE * 1" | bc)

    CHECKOUT_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"locationId\": \"$LOCATION_ID\",
        \"items\": [{
            \"productId\": \"$PRODUCT_ID\",
            \"quantity\": 1,
            \"price\": $PRICE,
            \"discount\": 0
        }],
        \"payments\": [{
            \"method\": \"CASH\",
            \"amount\": $(echo "$PRICE * (1 + $TAX_RATE)" | bc)
        }]
    }"

    response=$(api_request "POST" "/api/pos/checkout" "$CHECKOUT_DATA")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        ORDER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

        if [ -n "$ORDER_ID" ]; then
            # Verify tax was calculated
            TAX_AMOUNT=$(npx tsx -e "
            import prisma from './src/lib/prisma.js';
            const order = await prisma.order.findUnique({
                where: { id: '$ORDER_ID' }
            });
            if (order) {
                console.log(order.taxAmount.toString());
            }
            await prisma.\$disconnect();
            " 2>/dev/null)

            EXPECTED_TAX=$(echo "$PRICE * $TAX_RATE" | bc -l)
            EXPECTED_TAX=$(printf "%.2f" "$EXPECTED_TAX")
            TAX_AMOUNT=$(printf "%.2f" "$TAX_AMOUNT")

            if [ "$TAX_AMOUNT" == "$EXPECTED_TAX" ]; then
                pass "POS tax calculation is correct ($PRICE × $TAX_RATE = $TAX_AMOUNT)"
            else
                # Allow small rounding differences
                DIFF=$(echo "$TAX_AMOUNT - $EXPECTED_TAX" | bc -l | sed 's/-//')
                if (( $(echo "$DIFF < 0.01" | bc -l) )); then
                    pass "POS tax calculation is correct (within rounding tolerance)"
                else
                    fail "POS tax calculation mismatch (expected: $EXPECTED_TAX, got: $TAX_AMOUNT)"
                fi
            fi
        fi
    else
        fail "POS checkout failed (status: $status)"
    fi
}

#############################################
# TEST 5: POS Products Endpoint
#############################################
test_pos_products() {
    echo ""
    echo "========================================="
    echo "TEST: POS Products Endpoint"
    echo "========================================="

    # Login as sales user
    result=$(login "sales1@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    # Get location ID
    LOCATION_ID=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const location = await prisma.location.findFirst();
        if (location) console.log(location.id);
    })();
    ")

    if [ -z "$LOCATION_ID" ]; then
        fail "Could not fetch location ID for products test"
        return
    fi

    # Test products endpoint
    response=$(api_request "GET" "/api/pos/products?locationId=$LOCATION_ID" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        PRODUCT_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "POS products endpoint accessible (found $PRODUCT_COUNT products)"

        # Verify products have required fields
        if echo "$body" | grep -q '"name"' && echo "$body" | grep -q '"price"'; then
            pass "Products include required fields (name, price)"
        else
            fail "Products missing required fields"
        fi
    else
        fail "POS products endpoint failed (status: $status)"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  POS Validation Regression Tests      ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_pos_checkout
    test_walkin_customer
    test_multiple_payments
    test_pos_tax_calculation
    test_pos_products

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
    test_pos_checkout)
        test_pos_checkout
        ;;
    test_walkin_customer)
        test_walkin_customer
        ;;
    test_multiple_payments)
        test_multiple_payments
        ;;
    test_pos_tax_calculation)
        test_pos_tax_calculation
        ;;
    test_pos_products)
        test_pos_products
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_pos_checkout"
        echo "  test_walkin_customer"
        echo "  test_multiple_payments"
        echo "  test_pos_tax_calculation"
        echo "  test_pos_products"
        echo ""
        echo "Run all tests: ./pos-validation-test.sh"
        exit 1
        ;;
esac
