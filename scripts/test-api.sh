#!/bin/bash

BASE_URL="http://localhost:3000"
RESULTS_DIR="./test-results"
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Login as admin
echo "Logging in as admin..."
result=$(login "admin@billssupplies.com" "password")
if [[ $result != "SUCCESS" ]]; then
    echo -e "${RED}Login failed${NC}"
    exit 1
fi

# Get a quote ID from the database
QUOTE_ID=$(npx tsx -e "
import prisma from './src/lib/prisma';
(async () => {
    const quote = await prisma.quote.findFirst({
      where: {
        status: { in: ['PENDING', 'SENT'] },
        convertedToOrderId: null
      }
    });
    if (quote) {
      console.log(quote.id);
    }
})();
" 2>/dev/null)

if [ -z "$QUOTE_ID" ]; then
  echo -e "${YELLOW}No suitable quote found for conversion test${NC}"
  exit 0
fi

echo "Testing conversion of quote: $QUOTE_ID"

# Make the API request
response=$(curl -s -b "${RESULTS_DIR}/cookies.txt" -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/quotes/$QUOTE_ID/convert" \
    -H "Content-Type: application/json")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✓ Quote conversion successful${NC}"
    exit 0
else
    echo -e "${RED}✗ Quote conversion failed (status: $status)${NC}"
    echo "Response: $body"
    exit 1
fi
