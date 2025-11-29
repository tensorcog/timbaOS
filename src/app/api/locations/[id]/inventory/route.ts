import { logApiError } from '@/lib/api-logger';
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
                Product: {
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
                Product: {
                    category: 'asc',
                },
            },
        });

        return NextResponse.json(inventory);
    } catch (error) {
        logApiError('Error fetching location inventory:', error);
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
}
