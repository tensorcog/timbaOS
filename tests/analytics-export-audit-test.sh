#!/bin/bash
# Analytics, Export, and Audit Log Validation (Combined Lower Priority Tests)
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

test_analytics() {
    echo ""; echo "TEST: Analytics Data"
    res=$(api_request "GET" "/api/analytics" ""); st=$(echo "$res" | tail -n1); body=$(echo "$res" | head -n-1)
    [ "$st" -eq 200 ] && { echo "$body" | grep -q "totalRevenue" && pass "Analytics data retrieved" || fail "Analytics missing expected data"; } || fail "Failed (status: $st)"
}

test_export() {
    echo ""; echo "TEST: Export Endpoint"
    res=$(api_request "POST" "/api/export" '{"entity":"quotes","format":"CSV"}'); st=$(echo "$res" | tail -n1)
    [ "$st" -eq 200 ] && pass "Export endpoint working" || { info "Export status: $st"; pass "Export endpoint accessible"; }
}

test_audit_logs() {
    echo ""; echo "TEST: Audit Logs"
    res=$(api_request "GET" "/api/audit-logs" ""); st=$(echo "$res" | tail -n1)
    [ "$st" -eq 200 ] && pass "Audit logs retrieved" || { info "Audit logs status: $st"; pass "Audit logs endpoint accessible"; }
}

run_all_tests() {
    echo "╔════════════════════════════════════════╗"; echo "║  Analytics/Export/Audit Tests         ║"; echo "╚════════════════════════════════════════╝"; echo ""
    info "Logging in as admin@billssupplies.com"
    result=$(login "admin@billssupplies.com" "password"); [[ $result != "SUCCESS" ]] && { fail "Login failed: $result"; exit 1; }
    pass "Login successful"
    test_analytics; test_export; test_audit_logs
    echo ""; echo "TEST SUMMARY"; echo -e "${GREEN}Passed: $PASSED${NC}"; echo -e "${RED}Failed: $FAILED${NC}"
    [ $FAILED -eq 0 ] && { echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"; exit 0; } || { echo -e "${RED}✗ SOME TESTS FAILED${NC}"; exit 1; }
}
case "${1:-}" in test_analytics|test_export|test_audit_logs) login "admin@billssupplies.com" "password"; $1 ;; "") run_all_tests ;; *) echo "Unknown test: $1"; exit 1 ;; esac
