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
      description: 'Retrieve customer information including their ORDER HISTORY WITH PRODUCTS. Use this to search for customers by name or email, and to see what products they have purchased. IMPORTANT: When asked "what does customer X buy" or "what do customers named X like", use this tool with the customer name in the search parameter.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term for customer name or email (e.g., "Bill" to find all customers with Bill in their name)',
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
  {
    type: 'function',
    function: {
      name: 'get_employees',
      description: 'Retrieve employee/user information. Can search by name, email, or filter by role and location.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term for employee name or email',
          },
          role: {
            type: 'string',
            description: 'Filter by user role (SUPER_ADMIN, LOCATION_ADMIN, MANAGER, SALES, WAREHOUSE)',
            enum: ['SUPER_ADMIN', 'LOCATION_ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'],
          },
          locationId: {
            type: 'string',
            description: 'Filter by assigned location ID',
          },
          isActive: {
            type: 'boolean',
            description: 'Filter by active status (true = active only, false = inactive only)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of employees to return (default: 10)',
            default: 10,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoices',
      description: 'Retrieve invoices with filtering by status, customer, date range, and payment status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by invoice status (DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, WRITTEN_OFF)',
            enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF'],
          },
          customerId: {
            type: 'string',
            description: 'Filter by customer ID',
          },
          startDate: {
            type: 'string',
            description: 'Start date for invoice filtering (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for invoice filtering (ISO format)',
          },
          overdue: {
            type: 'boolean',
            description: 'Show only overdue invoices (true = overdue only)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of invoices to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quotes',
      description: 'Retrieve quotes with filtering by status, customer, and validity date.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by quote status (DRAFT, PENDING, SENT, ACCEPTED, REJECTED, EXPIRED)',
            enum: ['DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
          },
          customerId: {
            type: 'string',
            description: 'Filter by customer ID',
          },
          expiringsoon: {
            type: 'boolean',
            description: 'Show quotes expiring within 7 days',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of quotes to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointments',
      description: 'Retrieve appointments with filtering by date, customer, status, and location.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by appointment status (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW)',
            enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
          },
          customerId: {
            type: 'string',
            description: 'Filter by customer ID',
          },
          locationId: {
            type: 'string',
            description: 'Filter by location ID',
          },
          date: {
            type: 'string',
            description: 'Filter by specific date (ISO format YYYY-MM-DD)',
          },
          upcoming: {
            type: 'boolean',
            description: 'Show only upcoming appointments (future dates)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of appointments to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transfers',
      description: 'Retrieve inventory transfers between locations with filtering by status, location, and date.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by transfer status (PENDING, APPROVED, IN_TRANSIT, RECEIVED, CANCELLED)',
            enum: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
          },
          originLocationId: {
            type: 'string',
            description: 'Filter by origin location ID',
          },
          destinationLocationId: {
            type: 'string',
            description: 'Filter by destination location ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of transfers to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_payments',
      description: 'Retrieve invoice payment records with filtering by customer, date range, and payment method.',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: 'Filter by customer ID',
          },
          invoiceId: {
            type: 'string',
            description: 'Filter by invoice ID',
          },
          paymentMethod: {
            type: 'string',
            description: 'Filter by payment method (CASH, CHECK, CREDIT_CARD, DEBIT_CARD, ACH, WIRE_TRANSFER, OTHER)',
            enum: ['CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'WIRE_TRANSFER', 'OTHER'],
          },
          startDate: {
            type: 'string',
            description: 'Start date for payment filtering (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for payment filtering (ISO format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of payments to return (default: 20)',
            default: 20,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock_alerts',
      description: 'Get products with low stock levels (below reorder point) across all locations.',
      parameters: {
        type: 'object',
        properties: {
          locationId: {
            type: 'string',
            description: 'Filter by specific location ID',
          },
          critical: {
            type: 'boolean',
            description: 'Show only critical items (stock level = 0)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
            default: 50,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_audit_logs',
      description: 'Retrieve audit logs for compliance and debugging. View change history for entities.',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            description: 'Filter by entity type (e.g., Order, Invoice, Product, Customer)',
          },
          entityId: {
            type: 'string',
            description: 'Filter by specific entity ID',
          },
          userId: {
            type: 'string',
            description: 'Filter by user who made the change',
          },
          action: {
            type: 'string',
            description: 'Filter by action type (e.g., CREATE, UPDATE, DELETE)',
          },
          startDate: {
            type: 'string',
            description: 'Start date for audit log filtering (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for audit log filtering (ISO format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of logs to return (default: 50)',
            default: 50,
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
        console.log(`get_customers called with search="${search}", limit=${limit}`);
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
              take: 10,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                OrderItem: {
                  include: {
                    Product: {
                      select: {
                        id: true,
                        name: true,
                        sku: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
          take: limit,
        });
        console.log(`get_customers found ${customers.length} customers`);
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

      case 'get_employees': {
        const { search, role, locationId, isActive, limit = 10 } = args;
        
        // Build where clause
        const where = {
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        };

        // Handle search (name or email)
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Handle location filtering via UserLocation relation
        if (locationId) {
          where.UserLocation = {
            some: {
              locationId,
            },
          };
        }

        const employees = await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            profilePicture: true,
            UserLocation: {
              include: {
                Location: {
                  select: { name: true, code: true },
                },
              },
            },
          },
          take: limit,
          orderBy: { name: 'asc' },
        });

        return JSON.stringify(employees, null, 2);
      }

      case 'get_invoices': {
        const { status, customerId, startDate, endDate, overdue, limit = 20 } = args;
        
        const where = {
          ...(status && { status }),
          ...(customerId && { customerId }),
        };

        // Date range filtering
        if (startDate && endDate) {
          where.invoiceDate = {
            gte: new Date(startDate),
            lte: new Date(endDate),
          };
        }

        // Overdue filter (due date is in the past and not fully paid)
        if (overdue) {
          where.status = { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] };
          where.dueDate = { lt: new Date() };
        }

        const invoices = await prisma.invoice.findMany({
          where,
          include: {
            Customer: {
              select: { name: true, email: true },
            },
            Location: {
              select: { name: true },
            },
            InvoiceItem: {
              include: {
                Product: {
                  select: { name: true, sku: true },
                },
              },
            },
          },
          take: limit,
          orderBy: { invoiceDate: 'desc' },
        });

        return JSON.stringify(invoices, null, 2);
      }

      case 'get_quotes': {
        const { status, customerId, expiringsoon, limit = 20 } = args;
        
        const where = {
          ...(status && { status }),
          ...(customerId && { customerId }),
        };

        // Quotes expiring within 7 days
        if (expiringsoon) {
          const now = new Date();
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          
          where.validUntil = {
            gte: now,
            lte: sevenDaysFromNow,
          };
          where.status = { in: ['PENDING', 'SENT'] };
        }

        const quotes = await prisma.quote.findMany({
          where,
          include: {
            Customer: {
              select: { name: true, email: true },
            },
            Location: {
              select: { name: true },
            },
            QuoteItem: {
              include: {
                Product: {
                  select: { name: true, sku: true },
                },
              },
            },
            User: {
              select: { name: true, email: true },
            },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });

        return JSON.stringify(quotes, null, 2);
      }

      case 'get_appointments': {
        const { status, customerId, locationId, date, upcoming, limit = 20 } = args;
        
        const where = {
          ...(status && { status }),
          ...(customerId && { customerId }),
          ...(locationId && { locationId }),
        };

        // Filter by specific date
        if (date) {
          const targetDate = new Date(date);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          where.startTime = {
            gte: targetDate,
            lt: nextDay,
          };
        }

        // Upcoming appointments (future only)
        if (upcoming) {
          where.startTime = { gte: new Date() };
        }

        const appointments = await prisma.appointment.findMany({
          where,
          include: {
            Customer: {
              select: { name: true, email: true, phone: true },
            },
            Location: {
              select: { name: true, address: true },
            },
          },
          take: limit,
          orderBy: { startTime: 'asc' },
        });

        return JSON.stringify(appointments, null, 2);
      }


      case 'get_transfers': {
        const { status, originLocationId, destinationLocationId, limit = 20 } = args;
        
        const where = {
          ...(status && { status }),
          ...(originLocationId && { originLocationId }),
          ...(destinationLocationId && { destinationLocationId }),
        };

        const transfers = await prisma.inventoryTransfer.findMany({
          where,
          include: {
            Location_InventoryTransfer_originLocationIdToLocation: {
              select: { name: true, code: true },
            },
            Location_InventoryTransfer_destinationLocationIdToLocation: {
              select: { name: true, code: true },
            },
            User_InventoryTransfer_requestedByIdToUser: {
              select: { name: true, email: true },
            },
            User_InventoryTransfer_approvedByIdToUser: {
              select: { name: true, email: true },
            },
            TransferItem: {
              include: {
                Product: {
                  select: { name: true, sku: true },
                },
              },
            },
          },
          take: limit,
          orderBy: { requestedAt: 'desc' },
        });

        return JSON.stringify(transfers, null, 2);
      }

      case 'get_invoice_payments': {
        const { customerId, invoiceId, paymentMethod, startDate, endDate, limit = 20 } = args;
        
        const where = {
          ...(customerId && { customerId }),
          ...(invoiceId && { invoiceId }),
          ...(paymentMethod && { paymentMethod }),
        };

        // Date range filtering
        if (startDate && endDate) {
          where.paymentDate = {
            gte: new Date(startDate),
            lte: new Date(endDate),
          };
        }

        const payments = await prisma.invoicePayment.findMany({
          where,
          include: {
            Customer: {
              select: { name: true, email: true },
            },
            Invoice: {
              select: { invoiceNumber: true, totalAmount: true, status: true },
            },
            RecordedBy: {
              select: { name: true, email: true },
            },
          },
          take: limit,
          orderBy: { paymentDate: 'desc' },
        });

        return JSON.stringify(payments, null, 2);
      }

      case 'get_low_stock_alerts': {
        const { locationId, critical, limit = 50 } = args;
        
        const where = {
          ...(locationId && { locationId }),
        };

        // Critical items (out of stock)
        if (critical) {
          where.stockLevel = 0;
        } else {
          // Low stock: below reorder point
          where.stockLevel = {
            lte: prisma.locationInventory.fields.reorderPoint,
          };
        }

        const lowStockItems = await prisma.locationInventory.findMany({
          where: {
            ...(locationId && { locationId }),
            OR: critical 
              ? [{ stockLevel: 0 }]
              : [
                  { stockLevel: { equals: 0 } },
                  // This is a workaround - we'll filter in JS
                ],
          },
          include: {
            Product: {
              select: { name: true, sku: true, category: true },
            },
            Location: {
              select: { name: true, code: true },
            },
          },
          take: limit * 2, // Get extra and filter
          orderBy: { stockLevel: 'asc' },
        });

        // Filter for items below reorder point
        const filteredItems = critical 
          ? lowStockItems.filter(item => item.stockLevel === 0)
          : lowStockItems.filter(item => item.stockLevel <= item.reorderPoint);

        return JSON.stringify(filteredItems.slice(0, limit), null, 2);
      }

      case 'get_audit_logs': {
        const { entityType, entityId, userId, action, startDate, endDate, limit = 50 } = args;
        
        const where = {
          ...(entityType && { entityType }),
          ...(entityId && { entityId }),
          ...(userId && { userId }),
          ...(action && { action }),
        };

        // Date range filtering
        if (startDate && endDate) {
          where.timestamp = {
            gte: new Date(startDate),
            lte: new Date(endDate),
          };
        }

        const auditLogs = await prisma.auditLog.findMany({
          where,
          include: {
            User: {
              select: { name: true, email: true, role: true },
            },
          },
          take: limit,
          orderBy: { timestamp: 'desc' },
        });

        return JSON.stringify(auditLogs, null, 2);
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
    const { message, conversationHistory = [], model = 'qwen3:8b' } = req.body;

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
      content: `You are an AI assistant for Pine ERP, a comprehensive Enterprise Resource Planning system.

IMPORTANT INSTRUCTIONS:
1. When users ask about customers, products, orders, inventory, or analytics - IMMEDIATELY use the appropriate tool without asking for clarification
2. Use get_customers tool to search for customers by name or email
3. Use get_orders tool to get order information
4. Use get_products tool to search for products
5. Use get_analytics tool for sales metrics and top products
6. Do NOT ask users for date ranges or additional parameters unless absolutely necessary - use reasonable defaults
7. When searching for customers by name, use the search parameter with just the name (e.g., search:"Bill" to find customers named Bill)
8. Customer orders include OrderItem with Product details - use this to answer questions about what customers buy

EXAMPLES OF CORRECT TOOL USAGE:
- Query: "What do customers named Bill like to buy?" → Use get_customers with search:"Bill" (NOT get_products)
- Query: "Show me customer John Smith" → Use get_customers with search:"John Smith"
- Query: "Find lumber products" → Use get_products with search:"lumber"
- Query: "What are the top selling products?" → Use get_analytics with metric:"top_products"
- Query: "Show recent orders" → Use get_orders with limit:10

Be concise, professional, and accurate. Format data clearly and provide actionable insights.`,
    };

    // Initial call to Ollama with tools
    console.log('Calling Ollama API...');
    let response = await ollama.chat({
      model,
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
        model,
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
  res.json({ status: 'ok', model: 'qwen3:8b' });
});

app.listen(port, () => {
  console.log(`AI Bridge Server running on http://localhost:${port}`);
  console.log(`Using model: qwen3:8b`);
  console.log(`Connected to Ollama at: http://localhost:11434`);
});
