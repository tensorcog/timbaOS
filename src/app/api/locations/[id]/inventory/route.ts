import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const inventory = await prisma.locationInventory.findMany({
            where: {
                locationId: params.id,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        basePrice: true,
                        category: true,
                    },
                },
            },
            orderBy: {
                product: {
                    category: 'asc',
                },
            },
        });

        return NextResponse.json(inventory);
    } catch (error) {
        console.error('Error fetching location inventory:', error);
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
}
