#!/bin/bash

echo "🔄 Resetting Pine ERP Database..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Confirm with user
echo -e "${RED}WARNING: This will delete all data and reset the database!${NC}"
read -p "Are you sure? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

# Check if PostgreSQL is running
if ! docker ps | grep -q pine-postgres; then
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    docker start pine-postgres 2>/dev/null || docker run --name pine-postgres \
        -e POSTGRES_PASSWORD=password \
        -e POSTGRES_DB=pine_db \
        -p 5432:5432 \
        -d postgres:15
    sleep 5
fi

echo "Resetting database..."
npx prisma migrate reset --force

echo ""
echo -e "${GREEN}✓ Database reset complete!${NC}"
echo ""
echo "Database has been reset with fresh seed data:"
echo "  - 3 Locations (Main Yard, Westside Branch, Warehouse)"
echo "  - 10 Products with inventory"
echo "  - 4 Sample customers"
echo "  - 4 Sample orders"
echo "  - 4 Test users"
echo ""
echo "Run './start.sh' to start the application"
