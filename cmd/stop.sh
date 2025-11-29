#!/bin/bash

# Strict error handling
set -euo pipefail

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions with error checking
if [ ! -f "$SCRIPT_DIR/common.sh" ]; then
    echo "ERROR: common.sh not found in $SCRIPT_DIR"
    exit 1
fi
source "$SCRIPT_DIR/common.sh"

echo "🛑 Stopping timbaOS..."
echo ""

# Stop Next.js dev server using PID file
echo "Stopping Next.js development server..."
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        rm "$PID_FILE"
        echo -e "${GREEN}✓ Dev server stopped${NC}"
    else
        echo "Dev server not running (stale PID file)"
        rm "$PID_FILE"
    fi
else
    # Fallback: try to find and kill by pattern, but warn about it
    if pkill -f "next dev" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Stopped dev server (no PID file found)${NC}"
    else
        echo "No dev server running"
    fi
fi

# Stop PostgreSQL container
stop_postgres

echo ""
echo -e "${GREEN}✓ timbaOS stopped${NC}"
echo ""
echo "To start again, run: ./cmd/start.sh"
