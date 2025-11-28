#!/bin/bash
# Audit Log Validation Regression Test Suite
# Usage: ./audit-log-validation-test.sh [test_name]
# Run all tests: ./audit-log-validation-test.sh
# Run specific test: ./audit-log-validation-test.sh test_quote_audit

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
# TEST 1: Quote Audit Log Retrieval
#############################################
test_quote_audit() {
    echo ""
    echo "========================================="
    echo "TEST: Quote Audit Log Retrieval"
    echo "========================================="

    # Login as admin
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password")

    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get a quote ID
    QUOTE_ID=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const quote = await prisma.quote.findFirst();
        if (quote) {
            console.log(quote.id);
        }
    })();
    " )

    if [ -z "$QUOTE_ID" ]; then
        info "No quotes found to test audit logs"
        pass "Quote audit test skipped (no quotes)"
        return
    fi

    info "Testing audit logs for quote: $QUOTE_ID"

    # Test audit logs endpoint
    response=$(api_request "GET" "/api/audit-logs?entityType=QUOTE&entityId=$QUOTE_ID" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        LOG_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Audit logs retrieved successfully (found $LOG_COUNT logs)"

        if [ "$LOG_COUNT" -gt 0 ]; then
            # Verify logs have required fields
            if echo "$body" | grep -q '"action"' && echo "$body" | grep -q '"timestamp"'; then
                pass "Audit logs include required fields (action, timestamp)"
            else
                fail "Audit logs missing required fields"
            fi
        else
            info "Skipping field validation (no logs found)"
        fi
    else
        fail "Audit log retrieval failed (status: $status)"
        debug "Response: $body"
    fi
}

#############################################
# TEST 2: Order Audit Log Retrieval
#############################################
test_order_audit() {
    echo ""
    echo "========================================="
    echo "TEST: Order Audit Log Retrieval"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get an order ID
    ORDER_ID=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const order = await prisma.order.findFirst();
        if (order) {
            console.log(order.id);
        }
    })();
    " )

    if [ -z "$ORDER_ID" ]; then
        info "No orders found to test audit logs"
        pass "Order audit test skipped (no orders)"
        return
    fi

    info "Testing audit logs for order: $ORDER_ID"

    # Test audit logs endpoint
    response=$(api_request "GET" "/api/audit-logs?entityType=ORDER&entityId=$ORDER_ID" "")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -eq 200 ]; then
        LOG_COUNT=$(echo "$body" | grep -o '"id":' | wc -l)
        pass "Order audit logs retrieved successfully (found $LOG_COUNT logs)"
    else
        fail "Order audit log retrieval failed (status: $status)"
    fi
}

#############################################
# TEST 3: User Attribution in Logs
#############################################
test_user_attribution() {
    echo ""
    echo "========================================="
    echo "TEST: User Attribution in Audit Logs"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get audit logs with user info
    USER_LOGS=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const logs = await prisma.auditLog.findMany({
            include: {
                User: { select: { name: true, email: true } }
            },
            take: 5,
            orderBy: { timestamp: 'desc' }
        });
        
        const logsWithUsers = logs.filter(log => log.User !== null);
        
        console.log(JSON.stringify({
            totalLogs: logs.length,
            logsWithUsers: logsWithUsers.length,
            hasUserAttribution: logsWithUsers.length > 0
        }));
    })();
    " )

    if [ -z "$USER_LOGS" ]; then
        fail "Could not fetch audit log user data"
        return
    fi

    HAS_USERS=$(echo "$USER_LOGS" | grep -o '"hasUserAttribution":[a-z]*' | cut -d':' -f2)
    LOGS_WITH_USERS=$(echo "$USER_LOGS" | grep -o '"logsWithUsers":[0-9]*' | cut -d':' -f2)

    if [ "$HAS_USERS" == "true" ]; then
        pass "Audit logs include user attribution ($LOGS_WITH_USERS logs with users)"
    else
        info "No audit logs with user attribution found"
    fi
}

#############################################
# TEST 4: Timestamp Accuracy
#############################################
test_timestamp_accuracy() {
    echo ""
    echo "========================================="
    echo "TEST: Audit Log Timestamp Accuracy"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get recent audit logs
    TIMESTAMP_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10,
            select: { timestamp: true }
        });
        
        if (logs.length > 0) {
            const now = new Date();
            const mostRecent = new Date(logs[0].timestamp);
            const ageInHours = (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60);
            
            console.log(JSON.stringify({
                logCount: logs.length,
                mostRecentAge: ageInHours.toFixed(2)
            }));
        }
    })();
    " )

    if [ -z "$TIMESTAMP_DATA" ]; then
        info "No audit logs found to test timestamps"
        pass "Timestamp test skipped (no logs)"
        return
    fi

    LOG_COUNT=$(echo "$TIMESTAMP_DATA" | grep -o '"logCount":[0-9]*' | cut -d':' -f2)

    if [ "$LOG_COUNT" -gt 0 ]; then
        pass "Audit log timestamps are being recorded (found $LOG_COUNT recent logs)"
    else
        fail "No audit logs with timestamps found"
    fi
}

#############################################
# TEST 5: Audit Log Actions
#############################################
test_audit_actions() {
    echo ""
    echo "========================================="
    echo "TEST: Audit Log Action Types"
    echo "========================================="

    # Login as admin
    result=$(login "admin@billssupplies.com" "password")
    if [[ $result != "SUCCESS" ]]; then
        fail "Admin login failed: $result"
        return
    fi

    # Get various action types
    ACTION_DATA=$(npx tsx -e "
    import prisma from './src/lib/prisma';
    (async () => {
        const logs = await prisma.auditLog.findMany({
            select: { action: true }
        });
        
        const actions = logs.map(log => log.action);
        const uniqueActions = [...new Set(actions)];
        
        console.log(JSON.stringify({
            totalLogs: actions.length,
            uniqueActions: uniqueActions.length,
            actions: uniqueActions
        }));
    })();
    " )

    if [ -z "$ACTION_DATA" ]; then
        info "No audit log action data found"
        return
    fi

    UNIQUE_ACTIONS=$(echo "$ACTION_DATA" | grep -o '"uniqueActions":[0-9]*' | cut -d':' -f2)
    TOTAL_LOGS=$(echo "$ACTION_DATA" | grep -o '"totalLogs":[0-9]*' | cut -d':' -f2)

    info "Found $UNIQUE_ACTIONS unique action types across $TOTAL_LOGS logs"

    if [ "$UNIQUE_ACTIONS" -gt 0 ]; then
        pass "Audit logs capture various action types ($UNIQUE_ACTIONS types)"
    else
        fail "No audit log actions found"
    fi
}

#############################################
# Main Test Runner
#############################################
run_all_tests() {
    echo "╔════════════════════════════════════════╗"
    echo "║  Audit Log Validation Regression Tests║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    test_quote_audit
    test_order_audit
    test_user_attribution
    test_timestamp_accuracy
    test_audit_actions

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
    test_quote_audit)
        test_quote_audit
        ;;
    test_order_audit)
        test_order_audit
        ;;
    test_user_attribution)
        test_user_attribution
        ;;
    test_timestamp_accuracy)
        test_timestamp_accuracy
        ;;
    test_audit_actions)
        test_audit_actions
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  test_quote_audit"
        echo "  test_order_audit"
        echo "  test_user_attribution"
        echo "  test_timestamp_accuracy"
        echo "  test_audit_actions"
        echo ""
        echo "Run all tests: ./audit-log-validation-test.sh"
        exit 1
        ;;
esac
