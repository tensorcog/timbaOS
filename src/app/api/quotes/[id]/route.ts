import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { updateQuoteSchema } from '@/lib/validations/quote';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { currency } from '@/lib/currency';

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
                customer: true,
                location: true,
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

        const taxRate = parseFloat(quote.location.taxRate?.toString() || '0.0825');

        // Calculate new totals using Currency helper
        let subtotal = currency(0);
        let discountAmount = currency(0);

        const processedItems = items.map(item => {
            const unitPrice = currency(item.unitPrice);
            const quantity = item.quantity;
            const discount = currency(item.discount || 0);

            const itemSubtotal = unitPrice.multiply(quantity).subtract(discount);

            subtotal = subtotal.add(itemSubtotal);
            discountAmount = discountAmount.add(discount);

            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice.toNumber(),
                discount: discount.toNumber(),
                subtotal: itemSubtotal.toNumber(),
            };
        });

        const deliveryFee = currency(0); // Delivery fee not editable in edit mode
        const taxAmount = quote.customer.taxExempt
            ? currency(0)
            : subtotal.multiply(taxRate);

        const totalAmount = subtotal.add(deliveryFee).add(taxAmount);

        // Update quote with new items and totals
        const updatedQuote = await prisma.quote.update({
            where: { id: params.id },
            data: {
                subtotal: subtotal.toNumber(),
                discountAmount: discountAmount.toNumber(),
                taxAmount: taxAmount.toNumber(),
                deliveryFee: deliveryFee.toNumber(),
                totalAmount: totalAmount.toNumber(),
                notes: notes || null,
                items: {
                    deleteMany: {}, // Remove all existing items
                    create: processedItems,
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
                location: true,
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
                    new: totalAmount.toNumber()
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
