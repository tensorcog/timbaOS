# TimbaOS MCP Server

This is a Model Context Protocol (MCP) server that provides Claude with tools to interact with your TimbaOS system.

## Available Tools

The MCP server exposes the following tools to Claude:

1. **get_orders** - Retrieve orders with filtering options
2. **get_products** - Search and retrieve product information
3. **get_customers** - Search customer records
4. **get_inventory** - Check inventory levels across locations
5. **create_quote** - Create new quotes for customers
6. **get_analytics** - Get business analytics and metrics

## Setup

1. Install dependencies:

```bash
cd mcp-server
npm install
```

2. Build the server:

```bash
npm run build
```

3. Configure Claude Desktop to use this MCP server:

Edit your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "pine-erp": {
      "command": "node",
      "args": ["/absolute/path/to/timbaos/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-database-url-here"
      }
    }
  }
}
```

4. Restart Claude Desktop

## Development

Run in development mode with auto-reload:

```bash
npm run dev
```

## Usage

Once configured, Claude will automatically have access to these tools when chatting in Claude Desktop. You can ask Claude things like:

- "Show me recent orders"
- "What products do we have in stock?"
- "Create a quote for customer X"
- "What are our top selling products this month?"

The MCP server will handle these requests by querying your TimbaOS database directly.
