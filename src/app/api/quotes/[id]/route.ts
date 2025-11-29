import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { updateQuoteSchema } from '@/lib/validations/quote';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        // Validate input
        const validationResult = updateQuoteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { items, notes } = validationResult.data;

        // Get the quote to calculate new totals
        const quote = await prisma.quote.findUnique({
            where: { id: params.id },
            include: {
                Customer: true,
                Location: true,
            },
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        const taxRate = parseFloat(quote.Location.taxRate?.toString() || '0.0825');

        // Calculate new totals using Decimal for precision
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        const processedItems = items.map(item => {
            const unitPrice = new Decimal(item.unitPrice);
            const quantity = item.quantity;
            const discount = new Decimal(item.discount || 0);

            const itemSubtotal = unitPrice.times(quantity).minus(discount);

            subtotal = subtotal.plus(itemSubtotal);
            discountAmount = discountAmount.plus(discount);

            return {
                id: randomUUID(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                subtotal: itemSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
            };
        });

        const deliveryFee = new Decimal(0); // Delivery fee not editable in edit mode
        const taxAmount = quote.Customer.taxExempt
            ? new Decimal(0)
            : subtotal.times(taxRate);

        const totalAmount = subtotal.plus(deliveryFee).plus(taxAmount);

        // Update quote with new items and totals
        const updatedQuote = await prisma.quote.update({
            where: { id: params.id },
            data: {
                subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                deliveryFee: deliveryFee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                notes: notes || null,
                QuoteItem: {
                    deleteMany: {}, // Remove all existing items
                    create: processedItems,
                },
            },
            include: {
                QuoteItem: {
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
            entityType: 'Quote',
            entityId: quote.id,
            action: 'UPDATE',
            userId: userId,
            changes: {
                totalAmount: {
                    old: parseFloat(quote.totalAmount.toString()),
                    new: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                },
                notes: {
                    old: quote.notes,
                    new: notes
                },
                itemsCount: {
                    new: items.length
                }
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error('Quote update error:', error);
        return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }
}
