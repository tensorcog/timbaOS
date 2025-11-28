#!/bin/bash
# Common functions shared across timbaOS scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PostgreSQL container configuration
POSTGRES_CONTAINER="pine-postgres"
POSTGRES_PASSWORD="password"
POSTGRES_DB="pine_db"
POSTGRES_PORT="5432"

# PID file for development server
PID_FILE="/tmp/timbaos-dev.pid"

# Ensure PostgreSQL container is running
# Returns 0 if successful, 1 if failed
ensure_postgres_running() {
    echo -e "${BLUE}Checking PostgreSQL...${NC}"
    
    if docker ps | grep -q "$POSTGRES_CONTAINER"; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}PostgreSQL container not running. Starting it...${NC}"
    
    # Check if container exists but is stopped
    if docker ps -a | grep -q "$POSTGRES_CONTAINER"; then
        echo "Starting existing container..."
        if ! docker start "$POSTGRES_CONTAINER"; then
            echo -e "${RED}✗ Failed to start PostgreSQL container${NC}"
            return 1
        fi
    else
        echo "Creating new PostgreSQL container..."
        if ! docker run --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            -e POSTGRES_DB="$POSTGRES_DB" \
            -p "$POSTGRES_PORT:5432" \
            -d postgres:15; then
            echo -e "${RED}✗ Failed to create PostgreSQL container${NC}"
            return 1
        fi
    fi
    
    # Wait for PostgreSQL to be ready with proper health check
    echo "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}✗ PostgreSQL failed to become ready${NC}"
    return 1
}

# Stop PostgreSQL container
stop_postgres() {
    echo "Stopping PostgreSQL container..."
    if docker stop "$POSTGRES_CONTAINER" 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL stopped${NC}"
    else
        echo "Container not running"
    fi
}

# Check if database is initialized
# Returns 0 if initialized, 1 if not
is_database_initialized() {
    # Try to connect and check if any tables exist
    local table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d "$POSTGRES_DB" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 0 ] 2>/dev/null; then
        return 0
    else
        return 1
    fi
}
