import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import { currency } from '@/lib/currency';
import { randomUUID } from 'crypto';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items, deliveryAddress } = body;

        // Get the order
        const order = await prisma.order.findUnique({
            where: { id: params.id },
            include: {
                Customer: true,
                Location: true,
                OrderItem: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only allow editing PENDING orders
        if (order.status !== OrderStatus.PENDING) {
            return NextResponse.json(
                { error: 'Only PENDING orders can be edited' },
                { status: 400 }
            );
        }

        const taxRate = parseFloat(order.Location.taxRate?.toString() || '0');

        // Calculate new totals
        let subtotal = currency(0);
        let discountAmount = currency(0);

        const processedItems = items.map((item: any) => {
            const existingItem = order.OrderItem.find(oi => oi.productId === item.productId);
            if (!existingItem) {
                throw new Error(`Product ${item.productId} not found in order`);
            }

            const price = currency(existingItem.price);
            const quantity = item.quantity;
            const discount = currency(existingItem.discount);

            const itemSubtotal = price.multiply(quantity).subtract(discount);

            subtotal = subtotal.add(itemSubtotal);
            discountAmount = discountAmount.add(discount);

            return {
                id: randomUUID(),
                productId: item.productId,
                quantity: item.quantity,
                price: price.toPrismaDecimal(),
                discount: discount.toPrismaDecimal(),
            };
        });

        const deliveryFee = currency(order.deliveryFee);
        const taxAmount = order.Customer.taxExempt
            ? currency(0)
            : subtotal.multiply(taxRate);

        const totalAmount = subtotal.add(deliveryFee).add(taxAmount);

        // Update order
        const updatedOrder = await prisma.order.update({
            where: { id: params.id },
            data: {
                subtotal: subtotal.toPrismaDecimal(),
                discountAmount: discountAmount.toPrismaDecimal(),
                taxAmount: taxAmount.toPrismaDecimal(),
                totalAmount: totalAmount.toPrismaDecimal(),
                deliveryAddress: deliveryAddress || null,
                OrderItem: {
                    deleteMany: {},
                    create: processedItems,
                },
            },
            include: {
                OrderItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: true,
                Location: true,
            },
        });

        // Log activity
        await logActivity({
            entityType: 'Order',
            entityId: order.id,
            action: 'UPDATE',
            userId: session.user.id,
            changes: {
                totalAmount: {
                    old: parseFloat(order.totalAmount.toString()),
                    new: totalAmount.toPrismaDecimal()
                },
                itemsCount: {
                    old: order.OrderItem.length,
                    new: items.length
                }
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            order: updatedOrder,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Order update error:', error);
        return NextResponse.json(
            { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
