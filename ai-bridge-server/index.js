import express from 'express';
import cors from 'cors';
import { Ollama } from 'ollama';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = 3001;
const prisma = new PrismaClient();
const ollama = new Ollama({ host: 'http://localhost:11434' });

app.use(cors());
app.use(express.json());

// MCP Tools - these match your mcp-server/index.ts
const MCP_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_orders',
      description: 'Retrieve orders from the system. Can filter by status, customer, or date range.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by order status (PENDING, CONFIRMED, COMPLETED, CANCELLED)',
          },
          customerId: {
            type: 'string',
            description: 'Filter by customer ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of orders to return (default: 10)',
            default: 10,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Retrieve products from inventory. Can search by name or SKU.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term for product name or SKU',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of products to return (default: 10)',
            default: 10,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customers',
      description: 'Retrieve customer information. Can search by name or email.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term for customer name or email',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of customers to return (default: 10)',
            default: 10,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory',
      description: 'Get inventory levels for products across locations.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Filter by specific product ID',
          },
          locationId: {
            type: 'string',
            description: 'Filter by specific location ID',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics',
      description: 'Get business analytics and metrics (sales, revenue, top products, etc.)',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            description: 'Metric type: sales_summary, top_products, revenue_by_location',
            enum: ['sales_summary', 'top_products', 'revenue_by_location'],
          },
          startDate: {
            type: 'string',
            description: 'Start date for analytics (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for analytics (ISO format)',
          },
        },
        required: ['metric'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shipments',
      description: 'Retrieve shipment and delivery information. Can filter by status, scheduled date, or order.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by shipment status (PENDING, SCHEDULED, SHIPPED, DELIVERED, CANCELLED)',
            enum: ['PENDING', 'SCHEDULED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          },
          orderId: {
            type: 'string',
            description: 'Filter by specific order ID',
          },
          scheduledDate: {
            type: 'string',
            description: 'Filter by scheduled date (ISO format YYYY-MM-DD)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of shipments to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
];

// Execute MCP tool calls
async function executeTool(toolName, args) {
  try {
    switch (toolName) {
      case 'get_orders': {
        const { status, customerId, limit = 10 } = args;
        const orders = await prisma.order.findMany({
          where: {
            ...(status && { status }),
            ...(customerId && { customerId }),
          },
          include: {
            Customer: { select: { name: true, email: true } },
            OrderItem: {
              include: {
                Product: { select: { name: true, sku: true } },
              },
            },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        return JSON.stringify(orders, null, 2);
      }

      case 'get_products': {
        const { search, limit = 10 } = args;
        const products = await prisma.product.findMany({
          where: search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { sku: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          include: {
            LocationInventory: {
              include: {
                Location: { select: { name: true } },
              },
            },
          },
          take: limit,
        });
        return JSON.stringify(products, null, 2);
      }

      case 'get_customers': {
        const { search, limit = 10 } = args;
        const customers = await prisma.customer.findMany({
          where: search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          include: {
            orders: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                total: true,
                createdAt: true,
              },
            },
          },
          take: limit,
        });
        return JSON.stringify(customers, null, 2);
      }

      case 'get_inventory': {
        const { productId, locationId } = args;
        const inventory = await prisma.locationInventory.findMany({
          where: {
            ...(productId && { productId }),
            ...(locationId && { locationId }),
          },
          include: {
            Product: {
              select: { name: true, sku: true },
            },
            Location: {
              select: { name: true },
            },
          },
          orderBy: {
            stockLevel: 'asc',
          },
        });
        return JSON.stringify(inventory, null, 2);
      }

      case 'get_analytics': {
        const { metric, startDate, endDate } = args;
        let result;

        switch (metric) {
          case 'sales_summary': {
            const orders = await prisma.order.findMany({
              where: {
                status: 'COMPLETED',
                ...(startDate && endDate && {
                  createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }),
              },
              select: {
                total: true,
                createdAt: true,
              },
            });

            result = {
              totalSales: orders.reduce((sum, o) => sum + Number(o.total), 0),
              orderCount: orders.length,
              averageOrderValue:
                orders.length > 0
                  ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
                  : 0,
            };
            break;
          }

          case 'top_products': {
            const topProducts = await prisma.orderItem.groupBy({
              by: ['productId'],
              _sum: {
                quantity: true,
              },
              _count: true,
              orderBy: {
                _sum: {
                  quantity: 'desc',
                },
              },
              take: 10,
            });

            const productsWithDetails = await Promise.all(
              topProducts.map(async (item) => {
                const product = await prisma.product.findUnique({
                  where: { id: item.productId },
                  select: { name: true, sku: true },
                });
                return {
                  ...product,
                  totalQuantitySold: item._sum.quantity,
                  orderCount: item._count,
                };
              })
            );

            result = productsWithDetails;
            break;
          }

          case 'revenue_by_location': {
            const revenueByLocation = await prisma.order.groupBy({
              by: ['locationId'],
              where: {
                status: 'COMPLETED',
                ...(startDate && endDate && {
                  createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }),
              },
              _sum: {
                total: true,
              },
              _count: true,
            });

            const locationsWithDetails = await Promise.all(
              revenueByLocation.map(async (item) => {
                const location = await prisma.location.findUnique({
                  where: { id: item.locationId },
                  select: { name: true },
                });
                return {
                  location: location?.name,
                  revenue: item._sum.total,
                  orderCount: item._count,
                };
              })
            );

            result = locationsWithDetails;
            break;
          }
        }

        return JSON.stringify(result, null, 2);
      }

      case 'get_shipments': {
        const { status, orderId, scheduledDate, limit = 20 } = args;
        
        // Build where clause
        const where = {
          ...(status && { status }),
          ...(orderId && { orderId }),
        };

        // Handle scheduledDate filtering (search for shipments on that day)
        if (scheduledDate) {
          const date = new Date(scheduledDate);
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          
          where.scheduledDate = {
            gte: date,
            lt: nextDay,
          };
        }

        const shipments = await prisma.shipment.findMany({
          where,
          include: {
            Order: {
              include: {
                Customer: {
                  select: { name: true, email: true, phone: true },
                },
                Location: {
                  select: { name: true, address: true },
                },
              },
            },
            ShipmentItem: {
              include: {
                OrderItem: {
                  include: {
                    Product: {
                      select: { name: true, sku: true },
                    },
                  },
                },
              },
            },
          },
          take: limit,
          orderBy: { scheduledDate: 'asc' },
        });

        return JSON.stringify(shipments, null, 2);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: error.message });
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  console.log('=== Received chat request ===');
  console.log('Message:', req.body.message?.substring(0, 100));

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set timeout for the request (2 minutes)
    req.setTimeout(120000);
    res.setTimeout(120000);

    // Build messages array for Ollama
    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // System message for the ERP assistant
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant for Pine ERP, a comprehensive Enterprise Resource Planning system. You help users with:

- Managing orders, quotes, and invoices
- Tracking inventory across multiple locations
- Viewing customer information
- Analyzing sales data and business metrics
- Scheduling appointments
- Managing product catalog
- Handling inventory transfers

You have access to tools to query the ERP database. When users ask questions about orders, products, customers, inventory, or analytics, use the appropriate tools to get real-time data.

Be concise, professional, and accurate. Format data clearly and suggest relevant actions when appropriate.`,
    };

    // Initial call to Ollama with tools
    console.log('Calling Ollama API...');
    let response = await ollama.chat({
      model: 'qwen2.5:3b',
      messages: [systemMessage, ...messages],
      tools: MCP_TOOLS,
    });
    console.log('Ollama response received:', response.message.tool_calls ? 'with tool calls' : 'no tool calls');

    // Handle tool calls in a loop
    while (response.message.tool_calls && response.message.tool_calls.length > 0) {
      // Execute all tool calls
      const toolResults = await Promise.all(
        response.message.tool_calls.map(async (toolCall) => {
          console.log(`Executing tool: ${toolCall.function.name}`);
          const result = await executeTool(
            toolCall.function.name,
            toolCall.function.arguments
          );
          return {
            role: 'tool',
            content: result,
          };
        })
      );

      // Add assistant message and tool results to conversation
      messages.push(response.message);
      messages.push(...toolResults);

      // Continue conversation with tool results
      response = await ollama.chat({
        model: 'qwen2.5:3b',
        messages: [systemMessage, ...messages],
        tools: MCP_TOOLS,
      });
    }

    // Return final response
    console.log('Sending response to client');
    res.json({
      message: response.message.content,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('=== Chat error ===');
    console.error(error);
    res.status(500).json({ error: 'Failed to process chat request', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: 'qwen2.5:3b' });
});

app.listen(port, () => {
  console.log(`AI Bridge Server running on http://localhost:${port}`);
  console.log(`Using model: qwen2.5:3b`);
  console.log(`Connected to Ollama at: http://localhost:11434`);
});
