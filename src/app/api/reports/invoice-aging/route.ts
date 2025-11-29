import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import Decimal from 'decimal.js';
import { z } from 'zod';

// Validation schema for query parameters
const agingReportQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/reports/invoice-aging - Generate invoice aging report with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;

    // Only managers and admins can access reports
    if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validation = agingReportQuerySchema.safeParse({
      customerId: searchParams.get('customerId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { customerId, limit, offset } = validation.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build filters
    const filters: any = {
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }, // Only unpaid/partially paid
      balanceDue: { gt: 0 },
      deletedAt: null, // Keep the deletedAt filter from original
    };

    if (customerId) {
      filters.customerId = customerId;
    }

    // Get total count for pagination
    const totalCount = await prisma.invoice.count({ where: filters });

    // CRITICAL: Add pagination with LIMIT to prevent OOM
    const invoices = await prisma.invoice.findMany({
      where: filters,
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        balanceDue: true,
        Customer: {
          select: {
            id: true,
            name: true,
            email: true,
            accountNumber: true, // Added accountNumber back for consistency with later logic
          },
        },
        Location: { // Added Location back for consistency with later logic
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: limit, // CRITICAL: Limit results to prevent OOM
      skip: offset, // Support pagination
    });

    // Categorize invoices by aging buckets
    interface AgingBucket {
      current: Decimal;
      days1to30: Decimal;
      days31to60: Decimal;
      days61to90: Decimal;
      days90plus: Decimal;
      total: Decimal;
      invoiceCount: number;
    }

    const agingReport: Record<string, AgingBucket> = {};

    for (const invoice of invoices) { // Changed unpaidInvoices to invoices
      const customerId = invoice.customerId;
      const customerName = invoice.Customer.name;

      // Initialize bucket for customer if not exists
      if (!agingReport[customerId]) {
        agingReport[customerId] = {
          current: new Decimal(0),
          days1to30: new Decimal(0),
          days31to60: new Decimal(0),
          days61to90: new Decimal(0),
          days90plus: new Decimal(0),
          total: new Decimal(0),
          invoiceCount: 0,
        };
      }

      const balanceDue = new Decimal(invoice.balanceDue);
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Categorize  by aging bucket
      if (daysOverdue < 0) {
        // Not yet due
        agingReport[customerId].current = agingReport[customerId].current.plus(balanceDue);
      } else if (daysOverdue <= 30) {
        agingReport[customerId].days1to30 = agingReport[customerId].days1to30.plus(balanceDue);
      } else if (daysOverdue <= 60) {
        agingReport[customerId].days31to60 = agingReport[customerId].days31to60.plus(balanceDue);
      } else if (daysOverdue <= 90) {
        agingReport[customerId].days61to90 = agingReport[customerId].days61to90.plus(balanceDue);
      } else {
        agingReport[customerId].days90plus = agingReport[customerId].days90plus.plus(balanceDue);
      }

      agingReport[customerId].total = agingReport[customerId].total.plus(balanceDue);
      agingReport[customerId].invoiceCount++;
    }

    // Format response
    const agingData = Object.entries(agingReport).map(([customerId, buckets]) => {
      const customer = unpaidInvoices.find(inv => inv.customerId === customerId)?.Customer;

      return {
        customerId,
        customerName: customer?.name || 'Unknown',
        accountNumber: customer?.accountNumber,
        current: parseFloat(buckets.current.toFixed(2)),
        days1to30: parseFloat(buckets.days1to30.toFixed(2)),
        days31to60: parseFloat(buckets.days31to60.toFixed(2)),
        days61to90: parseFloat(buckets.days61to90.toFixed(2)),
        days90plus: parseFloat(buckets.days90plus.toFixed(2)),
        total: parseFloat(buckets.total.toFixed(2)),
        invoiceCount: buckets.invoiceCount,
      };
    });

    // Sort by total descending
    agingData.sort((a, b) => b.total - a.total);

    // Calculate summary
    const summary = agingData.reduce(
      (acc, customer) => ({
        current: acc.current + customer.current,
        days1to30: acc.days1to30 + customer.days1to30,
        days31to60: acc.days31to60 + customer.days31to60,
        days61to90: acc.days61to90 + customer.days61to90,
        days90plus: acc.days90plus + customer.days90plus,
        total: acc.total + customer.total,
        customerCount: acc.customerCount + 1,
        invoiceCount: acc.invoiceCount + customer.invoiceCount,
      }),
      {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        total: 0,
        customerCount: 0,
        invoiceCount: 0,
      }
    );

    return NextResponse.json({
      summary,
      customers: agingData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logApiError('Failed to generate invoice aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
