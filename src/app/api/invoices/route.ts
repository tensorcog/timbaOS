import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { createInvoiceSchema, formatZodErrors, invoiceQuerySchema } from '@/lib/validations/invoice';
import { z } from 'zod';
import { calculateDueDate, getLocationTimezone } from '@/lib/utils/timezone';

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        // Only managers and admins can view invoices
        if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        // Get and validate query parameters
        const searchParams = request.nextUrl.searchParams;
        
        // Validate query parameters
        const queryValidation = invoiceQuerySchema.safeParse({
            status: searchParams.get('status'),
            customerId: searchParams.get('customerId'),
            locationId: searchParams.get('locationId'),
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset'),
        });

        if (!queryValidation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: formatZodErrors(queryValidation.error.issues) },
                { status: 400 }
            );
        }

        const { status, customerId, locationId, startDate, endDate, limit, offset } = queryValidation.data;

        // Build filters
        const filters: any = {};

        // Location-based filtering
        if (userRole === UserRole.MANAGER) {
            filters.locationId = { in: userLocationIds };
        } else if (locationId) {
            filters.locationId = locationId;
        }

        if (status) {
            filters.status = status as InvoiceStatus;
        }

        if (customerId) {
            filters.customerId = customerId;
        }

        if (startDate) {
            filters.invoiceDate = { gte: new Date(startDate) };
        }

        if (endDate) {
            filters.invoiceDate = {
                ...filters.invoiceDate,
                lte: new Date(endDate),
            };
        }

        const invoices = await prisma.invoice.findMany({
            where: filters,
            include: {
                Customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                Location: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                InvoiceItem: {
                    include: {
                        Product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                invoiceDate: 'desc',
            },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        logApiError('Failed to fetch invoices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoices' },
            { status: 500 }
        );
    }
}

// POST /api/invoices - Create new invoice
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

        // Parse and validate request body
        const body = await request.json();
        
        const validation = createInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid invoice data', details: formatZodErrors(validation.error.issues) },
                { status: 400 }
            );
        }

        const {
            customerId,
            locationId,
            orderId,
            quoteId,
            items,
            dueDate,
            paymentTermDays,
            notes,
            terms,
            discountAmount,
            deliveryFee,
        } = validation.data;

        // Check location access
        if (userRole === UserRole.MANAGER && !userLocationIds.includes(locationId)) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this location' },
                { status: 403 }
            );
        }

        // Get customer and location details
        const [customer, location] = await Promise.all([
            prisma.customer.findUnique({
                where: { id: customerId },
                select: {
                    id: true,
                    name: true,
                    taxExempt: true,
                    paymentTermDays: true,
                    creditLimit: true,
                    creditHold: true,
                },
            }),
            prisma.location.findUnique({
                where: { id: locationId },
                select: { id: true, taxRate: true },
            }),
        ]);

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Check credit hold
        if (customer.creditHold) {
            return NextResponse.json(
                { error: 'Customer account is on credit hold' },
                { status: 400 }
            );
        }

        // Calculate totals from items
        let itemsSubtotal = new Decimal(0);
        let itemsDiscount = new Decimal(0);

        const invoiceItems = items.map((item) => {
            const quantity = new Decimal(item.quantity);
            const unitPrice = new Decimal(item.unitPrice);
            const itemDiscount = new Decimal(item.discount || 0);

            const subtotal = quantity.times(unitPrice).minus(itemDiscount);
            itemsSubtotal = itemsSubtotal.plus(subtotal);
            itemsDiscount = itemsDiscount.plus(itemDiscount);

            return {
                id: randomUUID(),
                productId: item.productId,
                description: item.description || null,
                quantity,
                unitPrice,
                discount: itemDiscount,
                subtotal,
            };
        });

        // Calculate invoice totals
        const invoiceSubtotal = itemsSubtotal;
        const invoiceDiscountAmount = new Decimal(discountAmount || 0);
        const invoiceDeliveryFee = new Decimal(deliveryFee || 0);

        // Calculate tax
        const taxableAmount = invoiceSubtotal
            .minus(invoiceDiscountAmount)
            .plus(invoiceDeliveryFee);

        const taxRate = new Decimal(location.taxRate || 0);
        const taxAmount = customer.taxExempt
            ? new Decimal(0)
            : taxableAmount.times(taxRate);

        const totalAmount = taxableAmount.plus(taxAmount);

        // FIXED: Calculate due date with proper timezone handling
        // Get location timezone for accurate due date calculation
        const locationTimezone = await getLocationTimezone(locationId);
        
        const invoiceDueDate = dueDate 
            ? new Date(dueDate)
            : calculateDueDate(
                new Date(), // invoice date (now)
                paymentTermDays || customer.paymentTermDays,
                locationTimezone
              );

        // Generate invoice number (counter-based)
        const lastInvoice = await prisma.invoice.findFirst({
            where: { locationId },
            orderBy: { createdAt: 'desc' },
            select: { invoiceNumber: true },
        });

        const nextNumber = lastInvoice
            ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') + 1
            : 1;

        const invoiceNumber = `INV-${location.id.substring(0, 4).toUpperCase()}-${nextNumber.toString().padStart(6, '0')}`;

        // Create invoice
        const invoice = await prisma.invoice.create({
            data: {
                id: randomUUID(),
                invoiceNumber,
                customerId,
                locationId,
                orderId: orderId || null,
                quoteId: quoteId || null,
                invoiceDate: new Date(),
                dueDate: invoiceDueDate,
                status: 'DRAFT',
                subtotal: invoiceSubtotal.toDecimalPlaces(2),
                taxAmount: taxAmount.toDecimalPlaces(2),
                discountAmount: invoiceDiscountAmount.toDecimalPlaces(2),
                deliveryFee: invoiceDeliveryFee.toDecimalPlaces(2),
                totalAmount: totalAmount.toDecimalPlaces(2),
                paidAmount: new Decimal(0),
                balanceDue: totalAmount.toDecimalPlaces(2),
                paymentTermDays: paymentTermDays || customer.paymentTermDays,
                notes: notes || null,
                terms: terms || null,
                createdById: session.user.id,
                InvoiceItem: {
                    create: invoiceItems,
                },
            },
            include: {
                Customer: true,
                Location: true,
                InvoiceItem: {
                    include: {
                        Product: true,
                    },
                },
            },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        logApiError('Failed to create invoice:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
