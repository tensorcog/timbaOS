import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const locationId = searchParams.get('locationId');

    if (!locationId) {
        return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    }

    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } },
                ],
                inventory: {
                    some: {
                        locationId,
                        stockLevel: { gt: 0 },
                    },
                },
            },
            include: {
                inventory: {
                    where: { locationId },
                    select: { stockLevel: true },
                },
                locationPricing: {
                    where: { locationId },
                    select: { price: true },
                },
            },
            take: 50,
        });

        const results = products.map(product => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.locationPricing[0]?.price
                ? parseFloat(product.locationPricing[0].price.toString())
                : parseFloat(product.basePrice.toString()),
            stockLevel: product.inventory[0]?.stockLevel || 0,
        }));

        return NextResponse.json(results);
    } catch (error) {
        console.error('Product search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
