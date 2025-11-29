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

# Function to check if dev server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Function to display status
show_status() {
    echo ""
    echo -e "${BLUE}=== timbaOS Status ===${NC}"
    echo ""
    
    # Check dev server
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}✓ Development Server: RUNNING${NC} (PID: $pid)"
    else
        echo -e "${RED}✗ Development Server: STOPPED${NC}"
    fi
    
    # Check PostgreSQL
    if docker ps | grep -q "$POSTGRES_CONTAINER"; then
        echo -e "${GREEN}✓ PostgreSQL: RUNNING${NC}"
    else
        echo -e "${RED}✗ PostgreSQL: STOPPED${NC}"
    fi
    
    echo ""
}

# Function to display menu
show_menu() {
    clear
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}        🌲 timbaOS Control Menu 🌲       ${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    show_status
    echo -e "${BLUE}What would you like to do?${NC}"
    echo ""
    echo "  1) Start timbaOS"
    echo "  2) Stop timbaOS"
    echo "  3) Restart timbaOS"
    echo "  4) Refresh Status"
    echo "  5) Reset Database"
    echo "  6) Run Tests"
    echo "  0) Exit"
    echo ""
    echo -n "Enter your choice: "
}

# Main loop
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1)
            echo ""
            if is_running; then
                echo -e "${YELLOW}timbaOS is already running!${NC}"
                echo "Use option 2 to stop it first, or option 3 to restart."
            else
                echo -e "${BLUE}Starting timbaOS...${NC}"
                "$SCRIPT_DIR/start.sh"
            fi
            ;;
        2)
            echo ""
            if ! is_running; then
                echo -e "${YELLOW}timbaOS is not running.${NC}"
            else
                echo -e "${BLUE}Stopping timbaOS...${NC}"
                "$SCRIPT_DIR/stop.sh"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;
        3)
            echo ""
            echo -e "${BLUE}Restarting timbaOS...${NC}"
            if is_running; then
                "$SCRIPT_DIR/stop.sh"
                sleep 2
            fi
            "$SCRIPT_DIR/start.sh"
            ;;
        4)
            # Just refresh - the menu will show updated status
            continue
            ;;
        5)
            echo ""
            echo -e "${YELLOW}⚠️  WARNING: This will delete all data!${NC}"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                "$SCRIPT_DIR/reset-db.sh"
            else
                echo "Database reset cancelled."
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;
        6)
            echo ""
            echo -e "${BLUE}Running tests...${NC}"
            "$SCRIPT_DIR/run-all-tests.sh"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        0)
            echo ""
            echo -e "${GREEN}👋 Goodbye!${NC}"
            echo ""
            exit 0
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            sleep 1
            ;;
    esac
done
