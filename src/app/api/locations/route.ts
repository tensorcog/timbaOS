import { logApiError } from '@/lib/api-logger';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const locations = await prisma.location.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { isWarehouse: 'asc' }, // Retail locations first
                { name: 'asc' },
            ],
        });

        return NextResponse.json(locations);
    } catch (error) {
        logApiError('Error fetching locations:', error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }
}
