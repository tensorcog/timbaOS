import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import Decimal from 'decimal.js';
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
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        const processedItems = items.map((item: any) => {
            const existingItem = order.OrderItem.find(oi => oi.productId === item.productId);
            if (!existingItem) {
                throw new Error(`Product ${item.productId} not found in order`);
            }

            const price = new Decimal(existingItem.price.toString());
            const quantity = item.quantity;
            const discount = new Decimal(existingItem.discount.toString());

            const itemSubtotal = price.times(quantity).minus(discount);

            subtotal = subtotal.plus(itemSubtotal);
            discountAmount = discountAmount.plus(discount);

            return {
                id: randomUUID(),
                productId: item.productId,
                quantity: item.quantity,
                price: price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
            };
        });

        const deliveryFee = new Decimal(order.deliveryFee.toString());
        const taxAmount = order.Customer.taxExempt
            ? new Decimal(0)
            : subtotal.times(taxRate);

        const totalAmount = subtotal.plus(deliveryFee).plus(taxAmount);

        // Update order
        const updatedOrder = await prisma.order.update({
            where: { id: params.id },
            data: {
                subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
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
                    new: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
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
