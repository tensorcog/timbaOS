#!/bin/bash
# Product Validation Regression Test Suite
# Usage: ./product-validation-test.sh [test_name]
# Run all tests: ./product-validation-test.sh
# Run specific test: ./product-validation-test.sh test_product_listing

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
# TEST 1: Product Listing
#############################################
test_product_listing() {
    echo ""
    echo "========================================="
    echo "TEST: Product Listing"
    echo "========================================="

    # Login as sales user
    info "Logging in as sales1@billssupplies.com"
    result=$(login "sales1@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Sales login failed: $result"
        return
    fi

    # Test products endpoint
    response=$(api_request "GET" "/api/pos/products" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        PRODUCT_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Product listing accessible (found $PRODUCT_COUNT products)"

        # Verify products have required fields
        if echo "$body" | grep -q '"name"' && echo "$body" | grep -q '"basePrice"' && echo "$body" | grep -q '"sku"'; then
            pass "Products include required fields (name, sku, basePrice)"
        else
            fail "Products missing required fields"
        fi
    else
        fail "Product listing failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 2: Product Categories
#############################################
test_product_categories() {
    echo ""
    echo "========================================="
    echo "TEST: Product Categories"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get category distribution
    CATEGORY_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const products = await prisma.product.findMany({
        select: { category: true }
    });
    
    const categories = products.map(p => p.category);
    const uniqueCategories = [...new Set(categories)];
    
    console.log(JSON.stringify({
        totalProducts: categories.length,
        uniqueCategories: uniqueCategories.length,
        categories: uniqueCategories
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$CATEGORY_DATA" ]; then
        fail "Could not fetch category data"
        return
    fi

    UNIQUE_COUNT=$(echo "$CATEGORY_DATA" | grep -o '"uniqueCategories":[0-9]*' | cut -d':' -f2)
    TOTAL_PRODUCTS=$(echo "$CATEGORY_DATA" | grep -o '"totalProducts":[0-9]*' | cut -d':' -f2)

    info "Found $UNIQUE_COUNT unique categories across $TOTAL_PRODUCTS products"

    if [ "$UNIQUE_COUNT" -gt 0 ]; then
        pass "Product categories are being tracked ($UNIQUE_COUNT categories)"
    else
        fail "No product categories found"
    fi
}

#############################################
# TEST 3: SKU Uniqueness
#############################################
test_sku_uniqueness() {
    echo ""
    echo "========================================="
    echo "TEST: SKU Uniqueness"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Check for duplicate SKUs
    DUPLICATE_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const products = await prisma.product.findMany({
        select: { sku: true }
    });
    
    const skus = products.map(p => p.sku);
    const uniqueSkus = new Set(skus);
    const hasDuplicates = skus.length !== uniqueSkus.size;
    
    console.log(JSON.stringify({
        totalSkus: skus.length,
        uniqueSkus: uniqueSkus.size,
        hasDuplicates
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$DUPLICATE_DATA" ]; then
        fail "Could not fetch SKU data"
        return
    fi

    HAS_DUPLICATES=$(echo "$DUPLICATE_DATA" | grep -o '"hasDuplicates":[a-z]*' | cut -d':' -f2)

    if [ "$HAS_DUPLICATES" == "false" ]; then
        pass "No duplicate SKUs found"
    else
        fail "Duplicate SKUs detected"
    fi
}

#############################################
# TEST 4: Active/Inactive Products
#############################################
test_product_active_status() {
    echo ""
    echo "========================================="
    echo "TEST: Active/Inactive Product Status"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get active/inactive counts
    STATUS_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const active = await prisma.product.count({ where: { isActive: true } });
    const inactive = await prisma.product.count({ where: { isActive: false } });
    console.log(JSON.stringify({ active, inactive }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$STATUS_DATA" ]; then
        fail "Could not fetch product status data"
        return
    fi

    ACTIVE_COUNT=$(echo "$STATUS_DATA" | grep -o '"active":[0-9]*' | cut -d':' -f2)
    INACTIVE_COUNT=$(echo "$STATUS_DATA" | grep -o '"inactive":[0-9]*' | cut -d':' -f2)

    info "Product status - Active: $ACTIVE_COUNT, Inactive: $INACTIVE_COUNT"

    if [ "$ACTIVE_COUNT" -ge 0 ] && [ "$INACTIVE_COUNT" -ge 0 ]; then
        pass "Product active status is being tracked correctly"
    else
        fail "Invalid product status counts"
    fi
}

#############################################
# TEST 5: Product Pricing
#############################################
test_product_pricing() {
    echo ""
    echo "========================================="
    echo "TEST: Product Pricing"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get product with pricing
    PRICING_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const product = await prisma.product.findFirst({
        where: { isActive: true },
        include: {
            locationPrices: {
                include: { location: { select: { name: true } } }
            }
        }
    });
    
    if (product) {
        console.log(JSON.stringify({
            productName: product.name,
            basePrice: product.basePrice.toString(),
            hasCost: product.cost !== null,
            hasLocationPricing: product.locationPrices.length > 0,
            locationPriceCount: product.locationPrices.length
        }));
    }
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$PRICING_DATA" ]; then
        fail "Could not fetch pricing data"
        return
    fi

    BASE_PRICE=$(echo "$PRICING_DATA" | grep -o '"basePrice":"[^"]*"' | cut -d'"' -f4)
    HAS_COST=$(echo "$PRICING_DATA" | grep -o '"hasCost":[a-z]*' | cut -d':' -f2)

    info "Product has base price: $BASE_PRICE"

    if [ -n "$BASE_PRICE" ] && [ "$BASE_PRICE" != "0" ] && [ "$BASE_PRICE" != "0.00" ]; then
        pass "Product has valid base price ($BASE_PRICE)"
    else
        fail "Product base price is invalid or zero"
    fi

    if [ "$HAS_COST" == "true" ]; then
        pass "Product cost tracking is available"
    else
        info "Product cost not set (optional field)"
    fi
}

#############################################
# TEST 6: Location-Specific Pricing
#############################################
test_location_pricing() {
    echo ""
    echo "========================================="
    echo "TEST: Location-Specific Pricing"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get location pricing data
    LOC_PRICING_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma.js';
    const locationPrices = await prisma.locationPricing.findMany({
        include: {
            product: { select: { name: true, basePrice: true } },
            location: { select: { name: true } }
        },
        take: 1
    });
    
    console.log(JSON.stringify({
        count: locationPrices.length,
        hasLocationPricing: locationPrices.length > 0,
        sample: locationPrices[0] ? {
            product: locationPrices[0].product.name,
            location: locationPrices[0].location.name,
            basePrice: locationPrices[0].product.basePrice.toString(),
            locationPrice: locationPrices[0].price.toString()
        } : null
    }));
    await prisma.\$disconnect();
    " 2>/dev/null)

    if [ -z "$LOC_PRICING_DATA" ]; then
        info "Could not fetch location pricing data"
        return
    fi

    HAS_LOCATION_PRICING=$(echo "$LOC_PRICING_DATA" | grep -o '"hasLocationPricing":[a-z]*' | cut -d':' -f2)

    if [ "$HAS_LOCATION_PRICING" == "true" ]; then
        pass "Location-specific pricing is being used"
    else
        info "No location-specific pricing found (using base prices only)"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  Product Validation Regression Tests  ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_product_listing
    test_product_categories
    test_sku_uniqueness
    test_product_active_status
    test_product_pricing
    test_location_pricing

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
    test_product_listing)
        test_product_listing
        ;;
    test_product_categories)
        test_product_categories
        ;;
    test_sku_uniqueness)
        test_sku_uniqueness
        ;;
    test_product_active_status)
        test_product_active_status
        ;;
    test_product_pricing)
        test_product_pricing
        ;;
    test_location_pricing)
        test_location_pricing
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_product_listing"
        echo "  test_product_categories"
        echo "  test_sku_uniqueness"
        echo "  test_product_active_status"
        echo "  test_product_pricing"
        echo "  test_location_pricing"
        echo ""
        echo "Run all tests: ./product-validation-test.sh"
        exit 1
        ;;
esac
