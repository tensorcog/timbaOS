#!/bin/bash

echo "🌲 Starting timbaOS..."
echo ""

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions
source "$SCRIPT_DIR/common.sh"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure PostgreSQL is running (uses proper health check with polling)
if ! ensure_postgres_running; then
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    exit 1
fi

echo ""

# Check if database is initialized
echo -e "${BLUE}Checking database schema...${NC}"
if ! is_database_initialized; then
    echo -e "${YELLOW}Database not initialized. Running migrations...${NC}"
    if ! npx prisma migrate deploy; then
        echo -e "${RED}✗ Failed to run migrations${NC}"
        exit 1
    fi
    echo ""
    echo -e "${YELLOW}Seeding database...${NC}"
    if ! npm run seed; then
        echo -e "${RED}✗ Failed to seed database${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Database schema exists${NC}"
fi
echo ""

# Start the development server
echo -e "${BLUE}Starting Next.js development server...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  timbaOS is starting...${NC}"
echo -e "${GREEN}  URL: http://localhost:3000${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start dev server and store PID
npm run dev &
DEV_PID=$!
echo "$DEV_PID" > "$PID_FILE"

# Wait for the dev server process
wait "$DEV_PID"
