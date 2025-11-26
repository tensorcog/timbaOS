import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { customerId, locationId, items, deliveryAddress, notes, validityDays } = body;

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

        // Get first user as creator (in production, use authenticated user)
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'No user found' }, { status: 400 });
        }

        const taxRate = parseFloat(location?.taxRate?.toString() || '0.0825');

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => {
            return sum + (item.unitPrice * item.quantity - (item.discount || 0));
        }, 0);

        const deliveryFee = deliveryAddress && subtotal < 1000 ? 100 : 0;
        const taxAmount = customer?.taxExempt ? 0 : subtotal * taxRate;
        const totalAmount = subtotal + deliveryFee + taxAmount;
        const discountAmount = items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0);

        // Generate quote number
        const quoteNumber = `Q-${Date.now()}`;

        // Calculate valid until date
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + (validityDays || 30));

        // Create quote
        const quote = await prisma.quote.create({
            data: {
                quoteNumber,
                locationId,
                customerId,
                createdById: user.id,
                status: 'PENDING',
                validUntil,
                subtotal,
                discountAmount,
                taxAmount,
                deliveryFee,
                totalAmount,
                notes: notes || null,
                terms: 'Standard terms and conditions apply.',
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount || 0,
                        subtotal: item.unitPrice * item.quantity - (item.discount || 0),
                    })),
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

        return NextResponse.json(quote);
    } catch (error) {
        console.error('Quote creation error:', error);
        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        const quotes = await prisma.quote.findMany({
            where: status ? { status } : undefined,
            include: {
                customer: true,
                location: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(quotes);
    } catch (error) {
        console.error('Quote fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}
