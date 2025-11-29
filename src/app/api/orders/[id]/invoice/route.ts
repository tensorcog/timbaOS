import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Managers and Admins can create invoices
        const userRole = session.user.role as UserRole;
        if (
            userRole !== UserRole.MANAGER &&
            userRole !== UserRole.LOCATION_ADMIN &&
            userRole !== UserRole.SUPER_ADMIN
        ) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        const orderId = params.id;

        // Fetch order with all details
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                Customer: true,
                Location: true,
                OrderItem: {
                    include: {
                        Product: true,
                    },
                },
                Invoice: true, // Check if invoice already exists
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check if invoice already exists
        if (order.Invoice.length > 0) {
            return NextResponse.json(
                {
                    error: 'Invoice already exists for this order',
                    invoiceId: order.Invoice[0].id
                },
                { status: 400 }
            );
        }

        // Generate invoice number
        const sequence = await prisma.invoiceSequence.create({ data: {} });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const seqNum = String(sequence.id).padStart(4, '0');
        const invoiceNumber = `INV-${year}${month}-${seqNum}`;

        // Calculate due date (default 30 days)
        const termDays = order.Customer.paymentTermDays || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);

        // Create invoice
        const invoice = await prisma.invoice.create({
            data: {
                id: randomUUID(),
                invoiceNumber,
                customerId: order.customerId,
                locationId: order.locationId,
                orderId: order.id,
                invoiceDate: new Date(),
                dueDate,
                status: InvoiceStatus.SENT, // Assume sent immediately since it's from an order
                subtotal: order.subtotal,
                taxAmount: order.taxAmount,
                discountAmount: order.discountAmount,
                deliveryFee: order.deliveryFee,
                totalAmount: order.totalAmount,
                paidAmount: new Decimal(0),
                balanceDue: order.totalAmount,
                paymentTermDays: termDays,
                createdById: session.user.id,
                InvoiceItem: {
                    create: order.OrderItem.map(item => ({
                        id: randomUUID(),
                        productId: item.productId,
                        description: item.Product.name,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        discount: item.discount,
                        subtotal: new Decimal(item.price).times(item.quantity).minus(item.discount),
                    })),
                },
            },
            include: {
                InvoiceItem: true,
            },
        });

        await logActivity({
            entityType: 'Invoice',
            entityId: invoice.id,
            action: 'CREATE',
            userId: session.user.id,
            changes: {
                orderId: { new: order.id },
                invoiceNumber: { new: invoiceNumber },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            invoice,
            message: `Invoice ${invoiceNumber} created successfully`,
        });

    } catch (error) {
        console.error('Create invoice error:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
