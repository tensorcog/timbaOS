import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quoteId = params.id;

        // Fetch the quote with all related data
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
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

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Validate quote can be converted
        if (quote.convertedToOrderId) {
            return NextResponse.json(
                { error: 'Quote has already been converted to an order' },
                { status: 400 }
            );
        }

        if (quote.status === 'REJECTED' || quote.status === 'EXPIRED') {
            return NextResponse.json(
                { error: `Cannot convert ${quote.status.toLowerCase()} quote to order` },
                { status: 400 }
            );
        }

        // Check if quote is expired
        const isExpired = new Date(quote.validUntil) < new Date();
        if (isExpired) {
            return NextResponse.json(
                { error: 'Cannot convert expired quote to order' },
                { status: 400 }
            );
        }

        // Generate order number using existing pattern
        const orderCount = await prisma.order.count();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

        // Create the order with quote data
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId: quote.customerId,
                locationId: quote.locationId,
                salesRepId: session.user.id,
                subtotal: quote.subtotal,
                taxAmount: quote.taxAmount,
                discountAmount: quote.discountAmount,
                deliveryFee: quote.deliveryFee,
                totalAmount: quote.totalAmount,
                deliveryAddress: quote.notes, // Using notes as delivery address if applicable
                status: 'PENDING',
                paymentStatus: 'PENDING',
                orderType: 'QUOTE_CONVERSION',
                fulfillmentType: 'PICKUP', // Default, can be updated later
                OrderItem: {
                    create: quote.QuoteItem.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: Number(item.unitPrice),
                        discount: Number(item.discount),
                    })),
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

        // Update the quote with conversion info
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                convertedToOrderId: order.id,
                status: 'ACCEPTED',
                acceptedAt: new Date(),
            },
        });

        // Log the conversion activity
        await logActivity({
            entityType: 'Quote',
            entityId: quoteId,
            action: 'CONVERT_TO_ORDER',
            userId: session.user.id,
            changes: {
                convertedToOrderId: { new: order.id },
                orderNumber: { new: orderNumber },
                status: { old: quote.status, new: 'ACCEPTED' },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        // Also log order creation
        await logActivity({
            entityType: 'Order',
            entityId: order.id,
            action: 'CREATE_FROM_QUOTE',
            userId: session.user.id,
            changes: {
                sourceQuoteId: { new: quoteId },
                quoteNumber: { new: quote.quoteNumber },
                orderNumber: { new: orderNumber },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            order,
            message: `Quote ${quote.quoteNumber} successfully converted to order ${orderNumber}`,
        });

    } catch (error) {
        console.error('Quote conversion error:', error);
        return NextResponse.json(
            { error: 'Failed to convert quote to order' },
            { status: 500 }
        );
    }
}
