#!/bin/bash

# Strict error handling: exit on error, undefined variables, and pipe failures
set -euo pipefail

echo "🌲 Starting timbaOS..."
echo ""

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions with error checking
if [ ! -f "$SCRIPT_DIR/common.sh" ]; then
    echo "ERROR: common.sh not found in $SCRIPT_DIR"
    exit 1
fi
source "$SCRIPT_DIR/common.sh"

# Cleanup function to handle script termination
cleanup() {
    local exit_code=$?
    echo ""
    echo -e "${YELLOW}Shutting down timbaOS...${NC}"
    
    # Kill dev server if it's running
    if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" 2>/dev/null; then
        echo "Stopping development server (PID: $DEV_PID)..."
        kill "$DEV_PID" 2>/dev/null || true
        wait "$DEV_PID" 2>/dev/null || true
    fi
    
    # Remove PID file
    [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit $exit_code
}

# Set trap to call cleanup on EXIT, INT, TERM
trap cleanup EXIT INT TERM

# Environment validation
echo -e "${BLUE}Validating environment...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Load NVM and use the specified Node version if .nvmrc exists
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    
    # Use .nvmrc if it exists in the project root
    if [ -f "$(dirname "$SCRIPT_DIR")/.nvmrc" ]; then
        echo -e "${BLUE}Loading Node version from .nvmrc...${NC}"
        nvm use || {
            echo -e "${YELLOW}⚠ Failed to use Node version from .nvmrc, continuing with current version${NC}"
        }
    fi
fi

# Kill any process using port 3000
if command -v lsof &> /dev/null; then
    PORT_PIDS=$(lsof -Pi :3000 -sTCP:LISTEN -t 2>/dev/null || true)
    if [ -n "$PORT_PIDS" ]; then
        echo -e "${YELLOW}⚠ Port 3000 is in use by PIDs: $PORT_PIDS${NC}"
        echo -e "${BLUE}Killing processes on port 3000...${NC}"
        echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
        sleep 1  # Give processes time to die
        echo -e "${GREEN}✓ Port 3000 cleared${NC}"
    else
        echo -e "${GREEN}✓ Port 3000 is available${NC}"
    fi
elif command -v fuser &> /dev/null; then
    # Alternative method using fuser
    if fuser 3000/tcp &>/dev/null; then
        echo -e "${YELLOW}⚠ Port 3000 is in use${NC}"
        echo -e "${BLUE}Killing processes on port 3000...${NC}"
        fuser -k 3000/tcp 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Port 3000 cleared${NC}"
    else
        echo -e "${GREEN}✓ Port 3000 is available${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot kill port processes (lsof/fuser not found)${NC}"
fi

echo ""

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
echo -e "${GREEN}  timbaOS is now running!${NC}"
echo -e "${GREEN}  URL: http://localhost:3000${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start dev server (no backgrounding nonsense, just run it directly)
# The trap will handle cleanup when the script receives termination signals
npm run dev &
DEV_PID=$!
echo "$DEV_PID" > "$PID_FILE"

# Wait for the dev server - when it exits (or is killed), cleanup trap will handle everything
wait "$DEV_PID"
