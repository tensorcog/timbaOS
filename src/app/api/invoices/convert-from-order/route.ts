import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { currency } from '@/lib/currency';

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
        let subtotal = currency(0);
        let discountAmount = currency(0);

        const invoiceItems = order.OrderItem.map((item) => {
            const itemPrice = currency(item.price);
            const itemDiscount = currency(item.discount || 0);
            const itemSubtotal = itemPrice.multiply(item.quantity).subtract(itemDiscount);

            subtotal = subtotal.add(itemSubtotal);
            discountAmount = discountAmount.add(itemDiscount);

            return {
                id: randomUUID(),
                productId: item.productId,
                description: item.Product.name,
                quantity: item.quantity,
                unitPrice: item.price,
                discount: itemDiscount.toPrismaDecimal(),
                subtotal: itemSubtotal.toPrismaDecimal(),
            };
        });

        // Calculate tax
        const taxRate = parseFloat(order.Location.taxRate?.toString() || '0');
        const taxAmount = order.Customer.taxExempt
            ? currency(0)
            : subtotal.multiply(taxRate);

        // Delivery fee
        const deliveryFee = currency(order.deliveryFee || 0);

        const totalAmount = subtotal.add(taxAmount).add(deliveryFee);

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
                subtotal: subtotal.toPrismaDecimal(),
                taxAmount: taxAmount.toPrismaDecimal(),
                discountAmount: discountAmount.toPrismaDecimal(),
                deliveryFee: deliveryFee.toPrismaDecimal(),
                totalAmount: totalAmount.toPrismaDecimal(),
                paidAmount: currency(0).toPrismaDecimal(),
                balanceDue: totalAmount.toPrismaDecimal(),
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
