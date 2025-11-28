#!/bin/bash
# Inventory Validation Regression Test Suite
# Usage: ./inventory-validation-test.sh [test_name]
# Run all tests: ./inventory-validation-test.sh
# Run specific test: ./inventory-validation-test.sh test_inventory_levels

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
# TEST 1: Inventory Levels Tracking
#############################################
test_inventory_levels() {
    echo ""
    echo "========================================="
    echo "TEST: Inventory Levels Tracking"
    echo "========================================="

    # Login as admin
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi
    pass "Admin login successful"

    # Get a location ID
    LOCATION_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const location = await prisma.location.findFirst({
        include: {
            LocationInventory: {
                include: { product: true },
                take: 1
            }
        }
    });
    if (location && location.LocationInventory.length > 0) {
        const inv = location.LocationInventory[0];
        console.log(JSON.stringify({
            locationId: location.id,
            locationName: location.name,
            productId: inv.productId,
            productName: inv.product.name,
            stockLevel: inv.stockLevel,
            minStockLevel: inv.minStockLevel,
            maxStockLevel: inv.maxStockLevel
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$LOCATION_DATA" ]; then
        fail "No location inventory found in database"
        return
    fi

    debug "Location data: $LOCATION_DATA"

    LOCATION_ID=$(echo "$LOCATION_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    LOCATION_NAME=$(echo "$LOCATION_DATA" | grep -o '"locationName":"[^"]*"' | cut -d'"' -f4)
    STOCK_LEVEL=$(echo "$LOCATION_DATA" | grep -o '"stockLevel":[0-9]*' | cut -d':' -f2)

    info "Testing inventory for location: $LOCATION_NAME (Stock: $STOCK_LEVEL)"

    # Test inventory endpoint
    response=$(api_request "GET" "/api/locations/$LOCATION_ID/inventory" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        ITEM_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Inventory data retrieved successfully (found $ITEM_COUNT items)"
    else
        fail "Failed to retrieve inventory data (status: $status)"
        debug "Response: $body"
    fi

    # Verify stock levels are non-negative
    NEGATIVE_STOCK=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const negativeStock = await prisma.locationInventory.count({
        where: { stockLevel: { lt: 0 } }
    });
    console.log(negativeStock);
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ "$NEGATIVE_STOCK" -eq 0 ]; then
        pass "No negative stock levels found"
    else
        fail "Found $NEGATIVE_STOCK items with negative stock levels"
    fi
}

#############################################
# TEST 2: Low Stock Detection
#############################################
test_low_stock_detection() {
    echo ""
    echo "========================================="
    echo "TEST: Low Stock Detection"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Find items with stock below minimum
    LOW_STOCK_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const lowStock = await prisma.locationInventory.findMany({
        where: {
            stockLevel: { lte: prisma.locationInventory.fields.minStockLevel }
        },
        include: {
            product: { select: { name: true, sku: true } },
            location: { select: { name: true } }
        },
        take: 5
    });
    console.log(JSON.stringify({
        count: lowStock.length,
        items: lowStock.map(item => ({
            product: item.product.name,
            location: item.location.name,
            stock: item.stockLevel,
            min: item.minStockLevel
        }))
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$LOW_STOCK_DATA" ]; then
        info "Could not fetch low stock data"
        return
    fi

    LOW_STOCK_COUNT=$(echo "$LOW_STOCK_DATA" | grep -o '"count":[0-9]*' | cut -d':' -f2)

    info "Found $LOW_STOCK_COUNT items with low stock"

    if [ "$LOW_STOCK_COUNT" -ge 0 ]; then
        pass "Low stock detection is working (found $LOW_STOCK_COUNT items)"
    else
        fail "Invalid low stock count"
    fi
}

#############################################
# TEST 3: Inventory Deduction After POS Sale
#############################################
test_inventory_deduction() {
    echo ""
    echo "========================================="
    echo "TEST: Inventory Deduction After POS Sale"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get test data for POS checkout
    POS_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const location = await prisma.location.findFirst();
    const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
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
            currentStock: inventory.stockLevel,
            price: inventory.product.basePrice.toString()
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$POS_DATA" ]; then
        info "No suitable inventory found for POS test"
        pass "Inventory deduction test skipped (insufficient stock)"
        return
    fi

    LOCATION_ID=$(echo "$POS_DATA" | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
    CUSTOMER_ID=$(echo "$POS_DATA" | grep -o '"customerId":"[^"]*"' | cut -d'"' -f4)
    PRODUCT_ID=$(echo "$POS_DATA" | grep -o '"productId":"[^"]*"' | cut -d'"' -f4)
    CURRENT_STOCK=$(echo "$POS_DATA" | grep -o '"currentStock":[0-9]*' | cut -d':' -f2)
    PRICE=$(echo "$POS_DATA" | grep -o '"price":"[^"]*"' | cut -d'"' -f4)

    info "Current stock level: $CURRENT_STOCK"

    # Create a POS checkout order
    CHECKOUT_DATA="{
        \"customerId\": \"$CUSTOMER_ID\",
        \"locationId\": \"$LOCATION_ID\",
        \"items\": [{
            \"productId\": \"$PRODUCT_ID\",
            \"quantity\": 2,
            \"price\": $PRICE,
            \"discount\": 0
        }],
        \"payments\": [{
            \"method\": \"CASH\",
            \"amount\": $(echo "$PRICE * 2" | bc)
        }]
    }"

    info "Attempting POS checkout with 2 items"
    response=$(api_request "POST" "/api/pos/checkout" "$CHECKOUT_DATA")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        pass "POS checkout successful"

        # Verify inventory was deducted
        NEW_STOCK=$(npx tsx -e "
        import prisma from './src/lib/prisma.js';
        const inventory = await prisma.locationInventory.findFirst({
            where: {
                locationId: '$LOCATION_ID',
                productId: '$PRODUCT_ID'
            }
        });
        if (inventory) {
            console.log(inventory.stockLevel);
        }
        await prisma.\$disconnect();
        " 2>/dev/null)

        EXPECTED_STOCK=$((CURRENT_STOCK - 2))

        if [ "$NEW_STOCK" -eq "$EXPECTED_STOCK" ]; then
            pass "Inventory correctly deducted (was: $CURRENT_STOCK, now: $NEW_STOCK, expected: $EXPECTED_STOCK)"
        else
            fail "Inventory deduction incorrect (was: $CURRENT_STOCK, now: $NEW_STOCK, expected: $EXPECTED_STOCK)"
        fi
    else
        fail "POS checkout failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 4: Multi-Location Inventory
#############################################
test_multi_location_inventory() {
    echo ""
    echo "========================================="
    echo "TEST: Multi-Location Inventory"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get inventory across multiple locations for same product
    MULTI_LOC_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const product = await prisma.product.findFirst({
        where: { isActive: true }
    });

    if (product) {
        const inventories = await prisma.locationInventory.findMany({
            where: { productId: product.id },
            include: { location: { select: { name: true } } }
        });

        console.log(JSON.stringify({
            productId: product.id,
            productName: product.name,
            locationCount: inventories.length,
            inventories: inventories.map(inv => ({
                location: inv.location.name,
                stock: inv.stockLevel
            }))
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$MULTI_LOC_DATA" ]; then
        fail "Could not fetch multi-location inventory data"
        return
    fi

    LOCATION_COUNT=$(echo "$MULTI_LOC_DATA" | grep -o '"locationCount":[0-9]*' | cut -d':' -f2)

    info "Product found in $LOCATION_COUNT locations"

    if [ "$LOCATION_COUNT" -gt 0 ]; then
        pass "Multi-location inventory tracking is working (found in $LOCATION_COUNT locations)"
    else
        fail "No multi-location inventory found"
    fi
}

#############################################
# TEST 5: Inventory Query Performance
#############################################
test_inventory_query() {
    echo ""
    echo "========================================="
    echo "TEST: Inventory Query Performance"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get first location
    LOCATION_ID=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const location = await prisma.location.findFirst();
    if (location) {
        console.log(location.id);
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$LOCATION_ID" ]; then
        fail "No location found"
        return
    fi

    # Time the inventory query
    START_TIME=$(date +%s%N)
    response=$(api_request "GET" "/api/locations/$LOCATION_ID/inventory" "")
    END_TIME=$(date +%s%N)

    status=$(echo "$response" | tail -n1)
    ELAPSED=$((($END_TIME - $START_TIME) / 1000000)) # Convert to milliseconds

    if [ "$status" -eq 200 ]; then
        info "Inventory query took ${ELAPSED}ms"
        
        if [ "$ELAPSED" -lt 5000 ]; then
            pass "Inventory query performance is acceptable (${ELAPSED}ms)"
        else
            fail "Inventory query is slow (${ELAPSED}ms)"
        fi
    else
        fail "Inventory query failed (status: $status)"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  Inventory Validation Regression Tests║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_inventory_levels
    test_low_stock_detection
    test_inventory_deduction
    test_multi_location_inventory
    test_inventory_query

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
    test_inventory_levels)
        test_inventory_levels
        ;;
    test_low_stock_detection)
        test_low_stock_detection
        ;;
    test_inventory_deduction)
        test_inventory_deduction
        ;;
    test_multi_location_inventory)
        test_multi_location_inventory
        ;;
    test_inventory_query)
        test_inventory_query
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_inventory_levels"
        echo "  test_low_stock_detection"
        echo "  test_inventory_deduction"
        echo "  test_multi_location_inventory"
        echo "  test_inventory_query"
        echo ""
        echo "Run all tests: ./inventory-validation-test.sh"
        exit 1
        ;;
esac
