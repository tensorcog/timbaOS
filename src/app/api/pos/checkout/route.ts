import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { customerId, locationId, items, payments } = body;

        // Get location for tax rate
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { taxRate: true },
        });

        // Get customer for tax exempt status
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { taxExempt: true },
        });

        const taxRate = parseFloat(location?.taxRate?.toString() || '0.0825');

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => {
            return sum + (item.price * item.quantity - (item.discount || 0));
        }, 0);

        const taxAmount = customer?.taxExempt ? 0 : subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        // Create order with transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber: `POS-${Date.now()}`,
                    locationId,
                    customerId,
                    orderType: 'POS',
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    subtotal,
                    taxAmount,
                    discountAmount: items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0),
                    totalAmount,
                    fulfillmentType: 'PICKUP',
                    completedAt: new Date(),
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount || 0,
                        })),
                    },
                    payments: {
                        create: payments.map((payment: any) => ({
                            paymentMethod: payment.method,
                            amount: payment.amount,
                            status: 'COMPLETED',
                        })),
                    },
                },
                include: {
                    items: true,
                    payments: true,
                },
            });

            // Deduct inventory
            for (const item of items) {
                await tx.locationInventory.updateMany({
                    where: {
                        locationId,
                        productId: item.productId,
                    },
                    data: {
                        stockLevel: {
                            decrement: item.quantity,
                        },
                    },
                });
            }

            return newOrder;
        });

        return NextResponse.json(order);
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
    }
}
