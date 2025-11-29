import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

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

        // Get query parameters for filtering
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');
        const locationId = searchParams.get('locationId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

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

        const body = await request.json();
        const {
            customerId,
            locationId,
            items,
            notes,
            terms,
            paymentTermDays,
            orderId,
            quoteId,
        } = body;

        // Validate required fields
        if (!customerId || !locationId || !items || items.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

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

        // Calculate totals
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        const processedItems = items.map((item: any) => {
            const unitPrice = new Decimal(item.unitPrice);
            const quantity = item.quantity;
            const discount = new Decimal(item.discount || 0);

            const itemSubtotal = unitPrice.times(quantity).minus(discount);

            subtotal = subtotal.plus(itemSubtotal);
            discountAmount = discountAmount.plus(discount);

            return {
                id: randomUUID(),
                productId: item.productId,
                description: item.description || '',
                quantity: quantity,
                unitPrice: unitPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                subtotal: itemSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
            };
        });

        // Calculate tax
        const taxRate = parseFloat(location.taxRate?.toString() || '0');
        const taxAmount = customer.taxExempt ? new Decimal(0) : subtotal.times(taxRate);

        // Delivery fee (if provided in body)
        const deliveryFee = new Decimal(body.deliveryFee || 0);

        const totalAmount = subtotal.plus(taxAmount).plus(deliveryFee);

        // Generate invoice number using sequence
        const sequence = await prisma.invoiceSequence.create({ data: {} });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const seqNum = String(sequence.id).padStart(4, '0');
        const invoiceNumber = `INV-${year}${month}-${seqNum}`;

        // Calculate due date
        const termDays = paymentTermDays || customer.paymentTermDays || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);

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
                dueDate,
                status: InvoiceStatus.DRAFT,
                subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                deliveryFee: deliveryFee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                paidAmount: new Decimal(0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                balanceDue: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                notes: notes || null,
                terms: terms || 'Payment due within specified terms. Late payments may incur fees.',
                paymentTermDays: termDays,
                createdById: session.user.id,
                InvoiceItem: {
                    create: processedItems,
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
