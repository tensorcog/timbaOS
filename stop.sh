#!/bin/bash

# Shutdown script for timbaos ERP application
# This script stops all running components gracefully

echo "🛑 Stopping timbaos ERP Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Stop Next.js Application
echo -e "${BLUE}[1/3]${NC} Stopping Next.js application..."
if pkill -f "next dev" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Next.js stopped"
else
    echo -e "${RED}✗${NC} No Next.js process found"
fi

# 2. Stop AI Bridge Server
echo -e "${BLUE}[2/3]${NC} Stopping AI Bridge Server..."
if pkill -f "node ai-bridge-server" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} AI Bridge Server stopped"
else
    echo -e "${RED}✗${NC} No AI Bridge Server process found"
fi

# 3. Stop Ollama Docker container (optional - keeps it running)
echo -e "${BLUE}[3/3]${NC} Stopping Ollama container..."
read -p "Stop Ollama container? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker stop ollama 2>/dev/null && echo -e "${GREEN}✓${NC} Ollama container stopped" || echo -e "${RED}✗${NC} Ollama not running"
else
    echo -e "${GREEN}✓${NC} Ollama container left running"
fi

echo ""
echo -e "${GREEN}✅ Shutdown complete!${NC}"
echo ""
