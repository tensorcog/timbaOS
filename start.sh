#!/bin/bash

# Startup script for timbaos ERP application
# This script starts all required components in the correct order

set -e  # Exit on any error

echo "🚀 Starting timbaos ERP Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start Ollama Docker container
echo -e "${BLUE}[1/3]${NC} Starting Ollama container..."
if docker ps | grep -q ollama; then
    echo -e "${GREEN}✓${NC} Ollama container already running"
else
    docker start ollama || docker run -d --gpus all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
    echo -e "${GREEN}✓${NC} Ollama container started"
    echo "   Waiting for Ollama to be ready..."
    sleep 3
fi

# Check if Ollama is responding
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama is ready (http://localhost:11434)"
else
    echo -e "${YELLOW}⚠${NC}  Ollama may need a moment to start up"
fi

echo ""

# 2. Start AI Bridge Server
echo -e "${BLUE}[2/3]${NC} Starting AI Bridge Server..."

# Kill any existing AI bridge server processes
pkill -f "node ai-bridge-server" 2>/dev/null || true

# Start AI bridge server in background
cd "$(dirname "$0")"
nohup node ai-bridge-server/index.js > ai-bridge-server.log 2>&1 &
AI_BRIDGE_PID=$!

# Wait for AI bridge server to be ready
echo "   Waiting for AI Bridge Server to start..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} AI Bridge Server ready (http://localhost:3001) [PID: $AI_BRIDGE_PID]"
        break
    fi
    sleep 1
done

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  AI Bridge Server may need more time to start"
    echo "   Check logs: tail -f ai-bridge-server.log"
fi

echo ""

# 3. Start Next.js Application
echo -e "${BLUE}[3/3]${NC} Starting Next.js application..."

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Start Next.js in background
nohup npm run dev > nextjs.log 2>&1 &
NEXTJS_PID=$!

echo "   Waiting for Next.js to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Next.js application ready (http://localhost:3000) [PID: $NEXTJS_PID]"
        break
    fi
    sleep 1
done

if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Next.js may need more time to start"
    echo "   Check logs: tail -f nextjs.log"
fi

echo ""
echo -e "${GREEN}✅ All components started!${NC}"
echo ""
echo "📊 Service Status:"
echo "   • Ollama:          http://localhost:11434 (Docker)"
echo "   • AI Bridge:       http://localhost:3001 [PID: $AI_BRIDGE_PID]"
echo "   • Next.js App:     http://localhost:3000 [PID: $NEXTJS_PID]"
echo ""
echo "📝 Logs:"
echo "   • AI Bridge:       tail -f ai-bridge-server.log"
echo "   • Next.js:         tail -f nextjs.log"
echo ""
echo "🛑 To stop all services: ./stop.sh"
echo ""
