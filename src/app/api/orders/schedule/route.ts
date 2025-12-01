import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logApiError } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const locationId = searchParams.get('locationId');

        if (!start || !end) {
            return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
        }

        // Validate and normalize date inputs
        let startDate: Date, endDate: Date;

        try {
            if (!start.includes('T')) {
                // Date-only string: treat as start of day UTC
                startDate = new Date(`${start}T00:00:00.000Z`);
            } else {
                startDate = new Date(start);
            }

            if (!end.includes('T')) {
                // Date-only string: treat as end of day UTC
                endDate = new Date(`${end}T23:59:59.999Z`);
            } else {
                endDate = new Date(end);
            }

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date format');
            }
        } catch (error) {
            return NextResponse.json({
                error: 'Invalid date format. Use YYYY-MM-DD or ISO8601 with timezone.'
            }, { status: 400 });
        }

        const shipments = await prisma.shipment.findMany({
            where: {
                scheduledDate: {
                    gte: startDate,
                    lte: endDate,
                },
                Order: locationId ? {
                    locationId: locationId
                } : undefined
            },
            include: {
                Order: {
                    include: {
                        Customer: true,
                        Location: true,
                    }
                },
                ShipmentItem: true
            },
            orderBy: {
                scheduledDate: 'asc',
            },
        });

        return NextResponse.json({ shipments });
    } catch (error) {
        logApiError('GET_SCHEDULE', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
