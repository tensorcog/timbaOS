import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

// POST /api/invoices/convert-from-order - Convert order to invoice
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
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }

        // Get order with all details
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                OrderItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: {
                    select: {
                        id: true,
                        paymentTermDays: true,
                        creditHold: true,
                        taxExempt: true,
                    },
                },
                Location: {
                    select: {
                        id: true,
                        taxRate: true,
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check if order is already invoiced
        const existingInvoice = await prisma.invoice.findFirst({
            where: { orderId: order.id },
        });

        if (existingInvoice) {
            return NextResponse.json(
                { error: 'Order has already been converted to an invoice' },
                { status: 400 }
            );
        }

        // Check location access
        if (
            userRole === UserRole.MANAGER &&
            !userLocationIds.includes(order.locationId)
        ) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this location' },
                { status: 403 }
            );
        }

        // Check credit hold
        if (order.Customer.creditHold) {
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
        const termDays = order.Customer.paymentTermDays || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);

        // Calculate totals from order items
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        const invoiceItems = order.OrderItem.map((item) => {
            const itemPrice = new Decimal(item.price);
            const itemDiscount = new Decimal(item.discount || 0);
            const itemSubtotal = itemPrice.times(item.quantity).minus(itemDiscount);

            subtotal = subtotal.plus(itemSubtotal);
            discountAmount = discountAmount.plus(itemDiscount);

            return {
                id: randomUUID(),
                productId: item.productId,
                description: item.Product.name,
                quantity: item.quantity,
                unitPrice: item.price,
                discount: itemDiscount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                subtotal: itemSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
            };
        });

        // Calculate tax
        const taxRate = parseFloat(order.Location.taxRate?.toString() || '0');
        const taxAmount = order.Customer.taxExempt
            ? new Decimal(0)
            : subtotal.times(taxRate);

        // Delivery fee
        const deliveryFee = new Decimal(order.deliveryFee || 0);

        const totalAmount = subtotal.plus(taxAmount).plus(deliveryFee);

        // Create invoice from order
        const invoice = await prisma.invoice.create({
            data: {
                id: randomUUID(),
                invoiceNumber,
                customerId: order.customerId,
                locationId: order.locationId,
                orderId: order.id,
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
                notes: null,
                terms: 'Payment due within specified terms.',
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
                Order: {
                    select: {
                        id: true,
                        orderNumber: true,
                    },
                },
            },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error('Failed to convert order to invoice:', error);
        return NextResponse.json(
            { error: 'Failed to convert order to invoice' },
            { status: 500 }
        );
    }
}
