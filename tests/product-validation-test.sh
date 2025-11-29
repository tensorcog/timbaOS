#!/bin/bash
# Product Validation Test Suite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$(dirname "$SCRIPT_DIR")/.env" ] && export $(grep -v '^#' "$(dirname "$SCRIPT_DIR")/.env" | xargs)
BASE_URL="${BASE_URL:-http://localhost:3000}"; RESULTS_DIR="./test-results"; mkdir -p "$RESULTS_DIR"
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
PASSED=0; FAILED=0
pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASSED++)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; ((FAILED++)); }
info() { echo -e "${BLUE}ℹ INFO${NC}: $1"; }
login() {
    csrf=$(curl -s -c "${RESULTS_DIR}/cookies.txt" "${BASE_URL}/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    res=$(curl -s -c "${RESULTS_DIR}/cookies.txt" -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/callback/credentials" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$2\",\"csrfToken\":\"$csrf\",\"json\":true}")
    st=$(echo "$res" | tail -n1); [ "$st" -eq 200 ] || [ "$st" -eq 302 ] && echo "SUCCESS" || echo "FAILED:$st"
}
api_request() { [ -n "$3" ] && curl -s -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" -X "$1" "${BASE_URL}$2" -H "Content-Type: application/json" -d "$3" || curl -s -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" -X "$1" "${BASE_URL}$2"; }

test_list_products() {
    echo ""; echo "TEST: List Products"
    res=$(api_request "GET" "/api/pos/products" ""); st=$(echo "$res" | tail -n1); body=$(echo "$res" | head -n-1)
    [ "$st" -eq 200 ] && { cnt=$(echo "$body" | grep -o '"id":' | wc -l); pass "Retrieved products (found $cnt)"; } || fail "Failed (status: $st)"
}

run_all_tests() {
    echo "╔════════════════════════════════════════╗"; echo "║  Product Validation Test Suite        ║"; echo "╚════════════════════════════════════════╝"; echo ""
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password"); [[ $result != "SUCCESS" ]] && { fail "Login failed: $result"; exit 1; }
    pass "Login successful"
    test_list_products
    echo ""; echo "TEST SUMMARY"; echo -e "${GREEN}Passed: $PASSED${NC}"; echo -e "${RED}Failed: $FAILED${NC}"
    [ $FAILED -eq 0 ] && { echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"; exit 0; } || { echo -e "${RED}✗ SOME TESTS FAILED${NC}"; exit 1; }
}
case "${1:-}" in test_list_products) login "admin@billssupplies.com" "password"; $1 ;; "") run_all_tests ;; *) echo "Unknown test: $1"; exit 1 ;; esac
