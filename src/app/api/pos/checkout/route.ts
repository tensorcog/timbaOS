import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OrderType, OrderStatus, PaymentStatus, FulfillmentType } from '@prisma/client';
import { currency } from '@/lib/currency';
import { posCheckoutSchema, PosCheckoutItem, PosPayment } from '@/lib/validations/pos';
import { classifyError, logError } from '@/lib/error-handler';
import { generateEntityNumber } from '@/lib/entity-number-generator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validationResult = posCheckoutSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { customerId, locationId, items, payments } = validationResult.data;

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

        // Calculate totals using Currency helper for precision
        let subtotal = currency(0);
        let discountAmount = currency(0);

        // Process items with proper currency handling
        for (const item of items) {
            const itemPrice = currency(item.price);
            const itemQuantity = item.quantity;
            const itemDiscount = currency(item.discount);

            const itemLineTotal = itemPrice.multiply(itemQuantity).subtract(itemDiscount);
            subtotal = subtotal.add(itemLineTotal);
            discountAmount = discountAmount.add(itemDiscount);
        }

        // Calculate tax with proper precision
        const taxAmount = customer?.taxExempt
            ? currency(0)
            : subtotal.multiply(taxRate);

        const totalAmount = subtotal.add(taxAmount);

        // Create order with transaction
        const order = await prisma.$transaction(async (tx) => {
            // Generate Order Number using centralized helper
            const orderNumber = await generateEntityNumber('ORDER', tx);

            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    locationId,
                    customerId,
                    orderType: OrderType.POS,
                    status: OrderStatus.COMPLETED,
                    paymentStatus: PaymentStatus.PAID,
                    subtotal: subtotal.toNumber(),
                    taxAmount: taxAmount.toNumber(),
                    discountAmount: discountAmount.toNumber(),
                    totalAmount: totalAmount.toNumber(),
                    fulfillmentType: FulfillmentType.PICKUP,
                    completedAt: new Date(),
                    items: {
                        create: items.map((item: PosCheckoutItem) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                        })),
                    },
                    payments: {
                        create: payments.map((payment: PosPayment) => ({
                            paymentMethod: payment.method,
                            amount: payment.amount,
                            status: PaymentStatus.PAID,
                        })),
                    },
                },
                include: {
                    items: true,
                    payments: true,
                },
            });

            // Deduct inventory in parallel (optimized from N+1 sequential queries)
            await Promise.all(
                items.map((item: PosCheckoutItem) =>
                    tx.locationInventory.updateMany({
                        where: {
                            locationId,
                            productId: item.productId,
                        },
                        data: {
                            stockLevel: {
                                decrement: item.quantity,
                            },
                        },
                    })
                )
            );

            return newOrder;
        });

        return NextResponse.json(order);
    } catch (error) {
        const { status, error: errorMessage, details } = classifyError(error);
        logError(error, 'POS Checkout');
        return NextResponse.json(
            { error: errorMessage, details },
            { status }
        );
    }
}
