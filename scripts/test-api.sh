#!/bin/bash

# Get a quote ID from the database
QUOTE_ID=$(cd /home/monty/spruce-killer && npx tsx -e "
import prisma from './src/lib/prisma';
const quote = await prisma.quote.findFirst({
  where: {
    status: { in: ['PENDING', 'SENT'] },
    convertedToOrderId: null
  }
});
if (quote) {
  console.log(quote.id);
} else {
  console.error('No quote found');
  process.exit(1);
}
await prisma.\$disconnect();
" 2>/dev/null)

if [ -z "$QUOTE_ID" ]; then
  echo "No suitable quote found"
  exit 1
fi

echo "Testing conversion of quote: $QUOTE_ID"
echo "Making API request..."

# Make the API request
curl -v -X POST "http://localhost:3000/api/quotes/$QUOTE_ID/convert" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=test" \
  2>&1 | tee /tmp/curl-output.txt

echo ""
echo "=== Response saved to /tmp/curl-output.txt ==="
