# AI Chat Feature Setup Guide

This guide will help you set up the AI Chat feature in your TimbaOS system, which includes both an in-app chat interface and an MCP server for Claude Desktop integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup In-App AI Chat](#setup-in-app-ai-chat)
3. [Setup MCP Server for Claude Desktop](#setup-mcp-server-for-claude-desktop)
4. [Features](#features)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

1. **Anthropic API Key**: Get one from [https://console.anthropic.com/](https://console.anthropic.com/)
2. **Node.js**: Version 18 or higher
3. **Running TimbaOS Instance**: Your main application should be set up and running

---

## Setup In-App AI Chat

The in-app AI chat is already integrated into your TimbaOS dashboard. Follow these steps to enable it:

### Step 1: Add API Key to Environment

1. Open your `.env` file (or create one if it doesn't exist)
2. Add your Anthropic API key:

```bash
ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx"
```

### Step 2: Restart Your Application

```bash
npm run dev
```

### Step 3: Access the AI Chat

1. Log in to your TimbaOS dashboard
2. Click on **AI Chat** in the sidebar navigation
3. Start chatting with your AI assistant!

### What Can You Ask?

The AI assistant can help with:

- **Orders**: "Show me recent orders", "What's the status of order #123?"
- **Inventory**: "What products are low in stock?", "Check inventory for product X"
- **Customers**: "Find customer information for...", "Show me top customers"
- **Analytics**: "How are sales this month?", "What are our top selling products?"
- **General Help**: "How do I create a quote?", "Explain the transfer process"

---

## Setup MCP Server for Claude Desktop

The MCP (Model Context Protocol) server allows Claude Desktop to directly query your ERP database and perform actions.

### Step 1: Install MCP Server Dependencies

```bash
cd mcp-server
npm install
```

### Step 2: Build the MCP Server

```bash
npm run build
```

This will create a `dist/` folder with the compiled JavaScript.

### Step 3: Configure Claude Desktop

1. Locate your Claude Desktop configuration file:

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Create or edit the file and add the MCP server configuration:

```json
{
  "mcpServers": {
    "pine-erp": {
      "command": "node",
      "args": ["/absolute/path/to/timbaos/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-postgresql-database-url-here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/timbaos/` with the actual absolute path to your project directory.

**Example**:

- macOS/Linux: `/home/monty/timbaos/mcp-server/dist/index.js`
- Windows: `C:\\Users\\YourName\\Projects\\timbaos\\mcp-server\\dist\\index.js`

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop. The MCP server will now be available.

### Step 5: Verify MCP Server Connection

In Claude Desktop, you should see a small indicator that the MCP server is connected. You can now ask Claude things like:

- "Show me the most recent orders from the TimbaOS"
- "What products do we have in stock?"
- "Create a quote for customer X with these items..."
- "What are our top selling products this month?"

Claude will automatically use the MCP server tools to query your database.

---

## Features

### In-App AI Chat Features

✅ **Real-time Chat Interface**: Beautiful, responsive chat UI integrated into your dashboard
✅ **Conversation History**: Maintains context throughout your conversation
✅ **User Context Aware**: Knows your role and accessible locations
✅ **Professional Assistance**: Helps with all aspects of your ERP system
✅ **Secure**: Requires authentication, only shows data you have access to

### MCP Server Tools

The MCP server provides Claude Desktop with these tools:

1. **get_orders** - Retrieve and filter orders

   - Filter by status (PENDING, CONFIRMED, COMPLETED, CANCELLED)
   - Filter by customer
   - Limit results

2. **get_products** - Search product catalog

   - Search by name or SKU
   - View inventory levels across locations

3. **get_customers** - Query customer information

   - Search by name or email
   - View recent order history

4. **get_inventory** - Check inventory levels

   - Filter by product or location
   - Real-time stock information

5. **create_quote** - Generate new quotes

   - Specify customer and items
   - Automatic total calculation

6. **get_analytics** - Business insights
   - Sales summaries
   - Top products analysis
   - Revenue by location

---

## Troubleshooting

### In-App Chat Issues

**Problem**: "Unauthorized" error when sending messages
**Solution**: Make sure you're logged in. Try refreshing the page and logging in again.

**Problem**: No response from AI
**Solution**:

- Check that your `ANTHROPIC_API_KEY` is set correctly in `.env`
- Verify you have API credits in your Anthropic account
- Check the browser console for errors (F12 → Console tab)

**Problem**: Chat doesn't appear in navigation
**Solution**: Clear your browser cache and reload the page

### MCP Server Issues

**Problem**: Claude Desktop doesn't show the MCP server
**Solution**:

- Verify the path in `claude_desktop_config.json` is absolute, not relative
- Make sure you've built the server (`npm run build` in mcp-server/)
- Check that the `dist/index.js` file exists
- Restart Claude Desktop completely

**Problem**: MCP server errors in Claude Desktop
**Solution**:

- Check the `DATABASE_URL` in the MCP config matches your actual database
- Ensure your database is accessible from your machine
- Check Claude Desktop logs for specific error messages

**Problem**: Database connection errors
**Solution**:

- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check that your database user has proper permissions

### Development Mode

To run the MCP server in development mode with auto-reload:

```bash
cd mcp-server
npm run dev
```

This is useful for testing and debugging.

---

## Security Notes

- **API Keys**: Never commit your `.env` file or API keys to version control
- **Database Access**: The MCP server has read/write access to your database
- **User Permissions**: Both the in-app chat and MCP server respect user roles and location permissions
- **Audit Logging**: All actions are logged in your application's audit system

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check the application logs for error messages
2. Review the Anthropic API documentation: [https://docs.anthropic.com/](https://docs.anthropic.com/)
3. Check the MCP documentation: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)

---

## What's Next?

- **Customize Prompts**: Edit `/src/lib/ai/claude-client.ts` to customize the system prompt
- **Add More Tools**: Extend the MCP server in `/mcp-server/index.ts` with additional tools
- **Streaming Responses**: The API supports streaming - set the `Accept: text/event-stream` header
- **Fine-tune Context**: Adjust user context in `/src/lib/ai/chat-service.ts`

Enjoy your AI-powered ERP system! 🚀
