import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

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
            return NextResponse.json(
                { error: 'Start and end dates are required' },
                { status: 400 }
            );
        }

        const startDate = startOfDay(parseISO(start));
        const endDate = endOfDay(parseISO(end));

        const whereClause: any = {
            deliveryDate: {
                gte: startDate,
                lte: endDate,
            },
            // status: {
            //     not: 'CANCELLED' // Should we exclude cancelled? Maybe show them as cancelled.
            // }
        };

        if (locationId) {
            whereClause.locationId = locationId;
        }

        // If user is not admin/manager, restrict to their location or sales rep?
        // For now, assuming if they can access the schedule, they can see orders.
        // But we should probably respect location access if implemented.
        
        const orders = await prisma.order.findMany({
            where: whereClause,
            select: {
                id: true,
                orderNumber: true,
                deliveryDate: true,
                status: true,
                fulfillmentType: true,
                totalAmount: true,
                Customer: {
                    select: {
                        name: true,
                    }
                },
                Location: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: {
                deliveryDate: 'asc',
            },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Error fetching scheduled orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch scheduled orders' },
            { status: 500 }
        );
    }
}
