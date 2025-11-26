#!/bin/bash

echo "🌲 Starting Pine ERP..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if PostgreSQL container is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if ! docker ps | grep -q pine-postgres; then
    echo -e "${YELLOW}PostgreSQL container not running. Starting it...${NC}"

    # Check if container exists but is stopped
    if docker ps -a | grep -q pine-postgres; then
        echo "Starting existing container..."
        docker start pine-postgres
    else
        echo "Creating new PostgreSQL container..."
        docker run --name pine-postgres \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_DB=pine_db \
            -p 5432:5432 \
            -d postgres:15
    fi

    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# Check if database is initialized
echo -e "${BLUE}Checking database schema...${NC}"
if ! npx prisma db pull --force > /dev/null 2>&1; then
    echo -e "${YELLOW}Database not initialized. Running migrations...${NC}"
    npx prisma migrate deploy
    echo ""
    echo -e "${YELLOW}Seeding database...${NC}"
    npm run seed
else
    echo -e "${GREEN}✓ Database schema exists${NC}"
fi
echo ""

# Start the development server
echo -e "${BLUE}Starting Next.js development server...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Pine ERP is starting...${NC}"
echo -e "${GREEN}  URL: http://localhost:3000${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
npm run dev
