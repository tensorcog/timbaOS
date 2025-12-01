import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OrderType, OrderStatus, PaymentStatus, FulfillmentType, UserRole } from '@prisma/client';
import Decimal from 'decimal.js';
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

        // Use Decimal directly for tax rate
        const taxRateDecimal = new Decimal(location.taxRate.toString());

        // Calculate totals using Decimal for precision
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        // Process items with proper decimal handling
        for (const item of items) {
            const itemPrice = new Decimal(item.price);
            const itemQuantity = item.quantity;
            const itemDiscount = new Decimal(item.discount);

            const itemLineTotal = itemPrice.times(itemQuantity).minus(itemDiscount);
            subtotal = subtotal.plus(itemLineTotal);
            discountAmount = discountAmount.plus(itemDiscount);
        }

        // Calculate tax with proper precision
        const taxAmount = customer?.taxExempt
            ? new Decimal(0)
            : subtotal.times(taxRateDecimal);

        const totalAmount = subtotal.plus(taxAmount);

        // Create order with transaction - ATOMIC inventory validation and deduction
        const order = await prisma.$transaction(async (tx) => {
            // Validate and reserve inventory INSIDE transaction to prevent race conditions
            // This fixes the TOCTOU (Time-of-Check-Time-of-Use) vulnerability
            for (const item of items) {
                const inventory = await tx.locationInventory.findUnique({
                    where: {
                        locationId_productId: {
                            locationId,
                            productId: item.productId,
                        },
                    },
                    select: {
                        stockLevel: true,
                        version: true,
                        Product: {
                            select: { name: true, sku: true },
                        },
                    },
                });

                if (!inventory) {
                    throw new Error(`Product ${item.productId} not available at this location`);
                }

                if (inventory.stockLevel < item.quantity) {
                    throw new Error(
                        `Insufficient stock for ${inventory.Product.name} (${inventory.Product.sku}). ` +
                        `Available: ${inventory.stockLevel}, Requested: ${item.quantity}`
                    );
                }

                // Optimistic locking: only update if version hasn't changed
                const updateResult = await tx.locationInventory.updateMany({
                    where: {
                        locationId,
                        productId: item.productId,
                        version: inventory.version,  // Only update if version matches
                        stockLevel: { gte: item.quantity },  // Double-check stock level
                    },
                    data: {
                        stockLevel: { decrement: item.quantity },
                        version: { increment: 1 },  // Increment version on update
                    },
                });

                if (updateResult.count === 0) {
                    throw new Error(
                        `Inventory for ${inventory.Product.name} changed during checkout. Please retry.`
                    );
                }
            }

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
                    subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
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
