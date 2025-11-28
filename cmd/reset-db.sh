#!/bin/bash

echo "🔄 Resetting timbaOS Database..."
echo ""

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions
source "$SCRIPT_DIR/common.sh"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Confirm with user
echo -e "${RED}WARNING: This will delete all data and reset the database!${NC}"
read -p "Are you sure? (yes/y to confirm): " -r
echo

# Accept both "yes" and "y" (case insensitive)
if [[ ! $REPLY =~ ^[Yy]([Ee][Ss])?$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

# Ensure PostgreSQL is running (uses shared function with proper health check)
if ! ensure_postgres_running; then
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    exit 1
fi

echo "Resetting database..."
if ! npx prisma migrate reset --force; then
    echo -e "${RED}✗ Database reset failed${NC}"
    exit 1
fi

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
echo "Run './cmd/start.sh' to start the application"
