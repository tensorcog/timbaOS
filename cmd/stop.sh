#!/bin/bash

echo "🛑 Stopping Pine ERP..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Kill Next.js dev server
echo "Stopping Next.js development server..."
pkill -f "next dev" 2>/dev/null || echo "No dev server running"

# Stop PostgreSQL container
echo "Stopping PostgreSQL container..."
docker stop pine-postgres 2>/dev/null || echo "Container not running"

echo ""
echo -e "${GREEN}✓ Pine ERP stopped${NC}"
echo ""
echo "To start again, run: ./start.sh"
