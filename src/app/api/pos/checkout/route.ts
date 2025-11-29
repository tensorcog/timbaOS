import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OrderType, OrderStatus, PaymentStatus, FulfillmentType, UserRole } from '@prisma/client';
import { currency } from '@/lib/currency';
import { posCheckoutSchema, PosCheckoutItem, PosPayment } from '@/lib/validations/pos';
import { classifyError, logError } from '@/lib/error-handler';
import { generateEntityNumber } from '@/lib/entity-number-generator';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    // Require authentication with SALES role or higher
    const { error, session } = await requireAuth(request, {
        roles: [UserRole.SALES, UserRole.MANAGER, UserRole.LOCATION_ADMIN, UserRole.SUPER_ADMIN],
    });

    if (error) {
        return error;
    }

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

        if (!location) {
            return NextResponse.json(
                { error: 'Location not found' },
                { status: 404 }
            );
        }

        // Get customer for tax exempt status
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { taxExempt: true },
        });

        // Use Decimal directly for tax rate - no conversion needed
        const taxRateDecimal = location.taxRate;

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

        // Calculate tax with proper precision using Decimal tax rate
        const taxAmount = customer?.taxExempt
            ? currency(0)
            : subtotal.multiply(currency(taxRateDecimal));

        const totalAmount = subtotal.add(taxAmount);

        // Validate inventory availability before processing
        const inventoryChecks = await Promise.all(
            items.map(async (item: PosCheckoutItem) => {
                const inventory = await prisma.locationInventory.findUnique({
                    where: {
                        locationId_productId: {
                            locationId,
                            productId: item.productId,
                        },
                    },
                    select: {
                        stockLevel: true,
                        Product: {
                            select: { name: true, sku: true },
                        },
                    },
                });

                if (!inventory) {
                    return {
                        valid: false,
                        error: `Product ${item.productId} not available at this location`,
                    };
                }

                if (inventory.stockLevel < item.quantity) {
                    return {
                        valid: false,
                        error: `Insufficient stock for ${inventory.Product.name} (${inventory.Product.sku}). Available: ${inventory.stockLevel}, Requested: ${item.quantity}`,
                    };
                }

                return { valid: true };
            })
        );

        // Check if any inventory validation failed
        const invalidItem = inventoryChecks.find((check) => !check.valid);
        if (invalidItem) {
            return NextResponse.json(
                { error: 'Inventory validation failed', details: invalidItem.error },
                { status: 400 }
            );
        }

        // Create order with transaction
        const order = await prisma.$transaction(async (tx) => {
            // Generate Order Number using centralized helper
            const orderNumber = await generateEntityNumber('ORDER', tx);

            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    id: randomUUID(),
                    orderNumber,
                    locationId,
                    customerId,
                    updatedAt: new Date(),
                    orderType: OrderType.POS,
                    status: OrderStatus.COMPLETED,
                    paymentStatus: PaymentStatus.PAID,
                    subtotal: subtotal.toPrismaDecimal(),
                    taxAmount: taxAmount.toPrismaDecimal(),
                    discountAmount: discountAmount.toPrismaDecimal(),
                    totalAmount: totalAmount.toPrismaDecimal(),
                    fulfillmentType: FulfillmentType.PICKUP,
                    completedAt: new Date(),
                    OrderItem: {
                        create: items.map((item: PosCheckoutItem) => ({
                            id: randomUUID(),
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                        })),
                    },
                    Payment: {
                        create: payments.map((payment: PosPayment) => ({
                            id: randomUUID(),
                            paymentMethod: payment.method,
                            amount: payment.amount,
                            status: PaymentStatus.PAID,
                        })),
                    },
                },
                include: {
                    OrderItem: true,
                    Payment: true,
                },
            });

            // Deduct inventory - using update() to ensure record exists
            await Promise.all(
                items.map((item: PosCheckoutItem) =>
                    tx.locationInventory.update({
                        where: {
                            locationId_productId: {
                                locationId,
                                productId: item.productId,
                            },
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
