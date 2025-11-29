import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

// POST /api/invoices/convert-from-quote - Convert quote to invoice
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        // Only managers and admins can create invoices
        if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { quoteId } = body;

        if (!quoteId) {
            return NextResponse.json(
                { error: 'Quote ID is required' },
                { status: 400 }
            );
        }

        // Get quote with all details
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                QuoteItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: {
                    select: {
                        id: true,
                        paymentTermDays: true,
                        creditHold: true,
                    },
                },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Check if quote is already invoiced
        const existingInvoice = await prisma.invoice.findFirst({
            where: { quoteId: quote.id },
        });

        if (existingInvoice) {
            return NextResponse.json(
                { error: 'Quote has already been converted to an invoice' },
                { status: 400 }
            );
        }

        // Check location access
        if (
            userRole === UserRole.MANAGER &&
            !userLocationIds.includes(quote.locationId)
        ) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this location' },
                { status: 403 }
            );
        }

        // Check credit hold
        if (quote.Customer.creditHold) {
            return NextResponse.json(
                { error: 'Customer account is on credit hold' },
                { status: 400 }
            );
        }

        // Generate invoice number
        const sequence = await prisma.invoiceSequence.create({ data: {} });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const seqNum = String(sequence.id).padStart(4, '0');
        const invoiceNumber = `INV-${year}${month}-${seqNum}`;

        // Calculate due date
        const termDays = quote.Customer.paymentTermDays || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);

        // Convert quote items to invoice items
        const invoiceItems = quote.QuoteItem.map((item) => ({
            id: randomUUID(),
            productId: item.productId,
            description: item.Product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.subtotal,
        }));

        // Create invoice from quote
        const invoice = await prisma.invoice.create({
            data: {
                id: randomUUID(),
                invoiceNumber,
                customerId: quote.customerId,
                locationId: quote.locationId,
                quoteId: quote.id,
                invoiceDate: new Date(),
                dueDate,
                status: InvoiceStatus.DRAFT,
                subtotal: quote.subtotal,
                taxAmount: quote.taxAmount,
                discountAmount: quote.discountAmount,
                deliveryFee: quote.deliveryFee,
                totalAmount: quote.totalAmount,
                paidAmount: new Decimal(0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                balanceDue: quote.totalAmount,
                notes: quote.notes,
                terms: quote.terms || 'Payment due within specified terms.',
                paymentTermDays: termDays,
                createdById: session.user.id,
                InvoiceItem: {
                    create: invoiceItems,
                },
            },
            include: {
                InvoiceItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: true,
                Location: true,
                Quote: {
                    select: {
                        id: true,
                        quoteNumber: true,
                    },
                },
            },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        logApiError('Failed to convert quote to invoice:', error);
        return NextResponse.json(
            { error: 'Failed to convert quote to invoice' },
            { status: 500 }
        );
    }
}
