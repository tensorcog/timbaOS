# AI Bridge Server

Local AI server that connects the Next.js timbaos app with Ollama (qwen3:8b) and MCP tools for database queries.

## Overview

This server acts as a bridge between:

- **Next.js App** (frontend chat interface)
- **Ollama** (local LLM running qwen3:8b)
- **MCP Tools** (database query functions)
- **PostgreSQL Database** (via Prisma)

## Architecture

```
Next.js (port 3000)
    ↓ HTTP
AI Bridge Server (port 3001)
    ↓ Tool Calls
MCP Tools (Prisma queries)
    ↓
PostgreSQL Database
```

## Available MCP Tools

1. **get_orders** - Retrieve orders with filtering by status, customer, date
2. **get_products** - Search products by name or SKU
3. **get_customers** - Find customers by name or email
4. **get_inventory** - Check inventory levels across locations
5. **get_analytics** - Business metrics (sales, revenue, top products)
6. **get_shipments** - Retrieve delivery schedules and shipment information
7. **get_employees** - Search employees by name, email, role, or location

## Usage

### Manual Start

```bash
cd /home/monty/timbaos
node ai-bridge-server/index.js
```

### Using Startup Script

```bash
./start.sh  # Starts everything (Ollama, AI Bridge, Next.js)
```

### Health Check

```bash
curl http://localhost:3001/health
# Returns: {"status":"ok","model":"qwen3:8b"}
```

## Configuration

- **Port**: 3001 (default)
- **Model**: qwen3:8b
- **Ollama URL**: http://localhost:11434
- **Database**: Uses parent project's Prisma client

## Dependencies

- express - HTTP server
- cors - Cross-origin support
- ollama - Ollama client library
- @prisma/client - Database ORM

## Development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

## Environment Variables

Uses parent project's `.env` file:

- `DATABASE_URL` - PostgreSQL connection string

## Logs

When started via `start.sh`, logs are written to:

- `/home/monty/timbaos/ai-bridge-server.log`

## API Endpoints

### POST /api/chat

Chat with the AI assistant using MCP tools.

**Request:**

```json
{
  "message": "Show me recent orders",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:**

```json
{
  "message": "Here are the recent orders...",
  "timestamp": "2025-12-13T04:30:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "model": "qwen3:8b"
}
```

## How It Works

1. Receives chat message from Next.js app
2. Builds conversation context with system prompt
3. Calls Ollama with message and available MCP tools
4. If Ollama requests tool calls:
   - Executes database queries via Prisma
   - Returns results to Ollama
   - Ollama generates final response
5. Returns response to Next.js app

## Requirements

- Node.js 20+
- Docker (for Ollama)
- GPU with 8GB+ VRAM (for qwen3:8b)
- PostgreSQL database

## Notes

- No API keys required - fully local
- GPU-accelerated inference via Ollama
- Tool calls happen automatically based on user questions
- Shares Prisma schema with parent Next.js project
