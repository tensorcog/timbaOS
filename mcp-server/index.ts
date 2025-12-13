import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define available tools for Claude to interact with your ERP system
const TOOLS: Tool[] = [
  {
    name: 'get_orders',
    description: 'Retrieve orders from the system. Can filter by status, customer, or date range.',
    inputSchema: {
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
  {
    name: 'get_products',
    description: 'Retrieve products from inventory. Can search by name or SKU.',
    inputSchema: {
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
  {
    name: 'get_customers',
    description: 'Retrieve customer information. Can search by name or email.',
    inputSchema: {
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
  {
    name: 'get_inventory',
    description: 'Get inventory levels for products across locations.',
    inputSchema: {
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
  {
    name: 'create_quote',
    description: 'Create a new quote for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Customer ID for the quote',
        },
        items: {
          type: 'array',
          description: 'Array of quote items',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
            },
            required: ['productId', 'quantity', 'price'],
          },
        },
        notes: {
          type: 'string',
          description: 'Additional notes for the quote',
        },
      },
      required: ['customerId', 'items'],
    },
  },
  {
    name: 'get_analytics',
    description: 'Get business analytics and metrics (sales, revenue, top products, etc.)',
    inputSchema: {
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
];

// MCP Server implementation
const server = new Server(
  {
    name: 'pine-erp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_orders': {
        const { status, customerId, limit = 10 } = args as any;
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orders, null, 2),
            },
          ],
        };
      }

      case 'get_products': {
        const { search, limit = 10 } = args as any;
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
            Category: { select: { name: true } },
            Inventory: {
              include: {
                Location: { select: { name: true } },
              },
            },
          },
          take: limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(products, null, 2),
            },
          ],
        };
      }

      case 'get_customers': {
        const { search, limit = 10 } = args as any;
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
            Order: {
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(customers, null, 2),
            },
          ],
        };
      }

      case 'get_inventory': {
        const { productId, locationId } = args as any;
        const inventory = await prisma.inventory.findMany({
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
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(inventory, null, 2),
            },
          ],
        };
      }

      case 'create_quote': {
        const { customerId, items, notes } = args as any;

        // Calculate total
        const total = items.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0
        );

        const quote = await prisma.quote.create({
          data: {
            customerId,
            status: 'PENDING',
            total,
            notes: notes || '',
            QuoteItem: {
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
          include: {
            Customer: true,
            QuoteItem: {
              include: {
                Product: true,
              },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(quote, null, 2),
            },
          ],
        };
      }

      case 'get_analytics': {
        const { metric, startDate, endDate } = args as any;

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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Pine ERP MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
