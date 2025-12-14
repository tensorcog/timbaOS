#!/bin/bash

# MCP Benchmark Setup Script
# This script sets up everything needed to benchmark MCP requests

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🌲 timbaOS MCP Benchmark Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo -e "${BLUE}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"

# Check if Docker Compose is available
echo -e "${BLUE}Checking Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
    echo -e "${GREEN}✓ Using docker-compose${NC}"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
    echo -e "${GREEN}✓ Using docker compose${NC}"
else
    echo -e "${RED}✗ Docker Compose is not available${NC}"
    echo "Please install Docker Compose"
    exit 1
fi
echo ""

# Start Ollama container
echo -e "${BLUE}Starting Ollama container...${NC}"
$DOCKER_COMPOSE up -d ollama

# Wait for Ollama to be ready
echo -e "${BLUE}Waiting for Ollama to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Ollama failed to start${NC}"
        echo "Check logs: docker logs timbaos-ollama"
        exit 1
    fi
    sleep 1
done
echo ""

# Pull required models
echo -e "${BLUE}Pulling qwen2.5:3b model...${NC}"
if docker exec timbaos-ollama ollama list | grep -q "qwen2.5:3b"; then
    echo -e "${GREEN}✓ qwen2.5:3b already downloaded${NC}"
else
    docker exec timbaos-ollama ollama pull qwen2.5:3b
    echo -e "${GREEN}✓ qwen2.5:3b downloaded${NC}"
fi

echo ""
echo -e "${BLUE}Pulling qwen3:8b model...${NC}"
if docker exec timbaos-ollama ollama list | grep -q "qwen3:8b"; then
    echo -e "${GREEN}✓ qwen3:8b already downloaded${NC}"
else
    docker exec timbaos-ollama ollama pull qwen3:8b
    echo -e "${GREEN}✓ qwen3:8b downloaded${NC}"
fi

echo ""
echo -e "${BLUE}Available models:${NC}"
docker exec timbaos-ollama ollama list

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start the AI Bridge Server:"
echo "   cd ai-bridge-server && node index.js"
echo ""
echo "2. Run the benchmark:"
echo "   node benchmark-mcp.js"
echo ""
