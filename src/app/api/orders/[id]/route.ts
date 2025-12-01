import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus, FulfillmentType } from '@prisma/client';
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
        const { items, deliveryAddress, deliveryDate, fulfillmentType, version } = body;

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

        // Optimistic Concurrency Control
        if (version !== undefined && order.version !== version) {
            return NextResponse.json({ 
                error: 'Order has been modified by another user. Please refresh and try again.',
                code: 'CONFLICT'
            }, { status: 409 });
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

        // Fetch all products involved to get prices for new items
        const productIds = items.map((item: any) => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        const processedItems = items.map((item: any) => {
            const existingItem = order.OrderItem.find(oi => oi.productId === item.productId);
            const product = products.find(p => p.id === item.productId);

            if (!product) {
                throw new Error(`Product ${item.productId} not found`);
            }

            let price: Decimal;
            let discount: Decimal;

            if (existingItem) {
                // For existing items, preserve the original price and discount
                // unless we want to allow re-pricing. For now, matching original logic.
                price = new Decimal(existingItem.price.toString());
                discount = new Decimal(existingItem.discount.toString());
            } else {
                // For new items, use the current product price
                price = new Decimal(product.basePrice.toString());
                discount = new Decimal(0); // Default no discount for new items
            }

            const quantity = item.quantity;
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
                version: { increment: 1 }, // Increment version
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
                },
                deliveryDate: {
                    old: order.deliveryDate,
                    new: deliveryDate
                },
                fulfillmentType: {
                    old: order.fulfillmentType,
                    new: fulfillmentType
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
        logApiError('Order update error:', error);
        return NextResponse.json(
            { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
