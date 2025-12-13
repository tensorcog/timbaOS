import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { logApiError } from '@/lib/api-logger';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const shipments = await prisma.shipment.findMany({
            where: { orderId: params.id },
            include: {
                ShipmentItem: {
                    include: {
                        OrderItem: {
                            include: {
                                Product: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ shipments });
    } catch (error) {
        logApiError('GET_SHIPMENTS', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// TypeScript interfaces for proper typing
interface ShipmentItemInput {
    orderItemId: string;
    quantity: number;
}

// Date validation regex patterns
const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_WITH_TZ_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const ISO_DATETIME_WITH_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/;

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scheduledDate, duration, method, carrier, trackingNumber, items } = body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
        }

        const typedItems = items as ShipmentItemInput[];

        // 1. Validate all orderItemIds belong to this order
        const orderItemIds = typedItems.map(item => item.orderItemId);
        const orderItems = await prisma.orderItem.findMany({
            where: { 
                id: { in: orderItemIds },
                orderId: params.id 
            }
        });

        if (orderItems.length !== typedItems.length) {
            return NextResponse.json({ 
                error: 'Invalid orderItemId - some items do not belong to this order' 
            }, { status: 400 });
        }

        // 2. Validate quantity constraints (BATCH QUERY - NO N+1)
        const shippedQuantities = await prisma.shipmentItem.groupBy({
            by: ['orderItemId'],
            where: {
                orderItemId: { in: orderItemIds },
                Shipment: { 
                    status: { notIn: ['CANCELLED'] }
                }
            },
            _sum: { quantity: true }
        });

        // Create lookup map for O(1) access
        const shippedMap = new Map<string, number>(
            shippedQuantities.map((sq: { orderItemId: string; _sum: { quantity: number | null } }) => 
                [sq.orderItemId, sq._sum.quantity || 0]
            )
        );

        // Validate each item's quantity
        for (const item of typedItems) {
            const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
            if (!orderItem) {
                return NextResponse.json({
                    error: `OrderItem ${item.orderItemId} not found`
                }, { status: 400 });
            }

            const alreadyShipped = shippedMap.get(item.orderItemId) || 0;
            const available = Number(orderItem.quantity) - alreadyShipped;

            if (item.quantity > available) {
                return NextResponse.json({
                    error: `Cannot ship ${item.quantity} units of item ${item.orderItemId}. Only ${available} available (${orderItem.quantity} ordered, ${alreadyShipped} already shipped).`
                }, { status: 400 });
            }

            if (item.quantity <= 0) {
                return NextResponse.json({
                    error: 'Quantity must be greater than 0'
                }, { status: 400 });
            }
        }

        // 3. Validate and parse scheduled date (REGEX-BASED)
        let parsedDate: Date | null = null;
        if (scheduledDate) {
            if (ISO_DATE_ONLY_REGEX.test(scheduledDate)) {
                // Date-only string: treat as midnight UTC
                parsedDate = new Date(`${scheduledDate}T00:00:00.000Z`);
            } else if (ISO_DATETIME_WITH_TZ_REGEX.test(scheduledDate) || ISO_DATETIME_WITH_OFFSET_REGEX.test(scheduledDate)) {
                // Full ISO datetime with timezone
                parsedDate = new Date(scheduledDate);
            } else {
                return NextResponse.json({
                    error: 'Invalid date format. Use YYYY-MM-DD or ISO8601 with timezone (e.g., 2025-12-01T12:00:00Z)'
                }, { status: 400 });
            }

            // Verify the date is actually valid (catches things like 2025-13-45)
            if (isNaN(parsedDate.getTime())) {
                return NextResponse.json({
                    error: 'Invalid date value'
                }, { status: 400 });
            }
        }

        // Create shipment
        const shipment = await prisma.shipment.create({
            data: {
                id: crypto.randomUUID(),
                orderId: params.id,
                scheduledDate: parsedDate,
                duration: duration || 90,
                method: method || 'DELIVERY',
                carrier,
                trackingNumber,
                status: 'SCHEDULED',
                ShipmentItem: {
                    create: typedItems.map(item => ({
                        id: crypto.randomUUID(),
                        orderItemId: item.orderItemId,
                        quantity: item.quantity
                    }))
                }
            },
            include: {
                ShipmentItem: {
                    include: {
                        OrderItem: {
                            include: {
                                Product: true
                            }
                        }
                    }
                }
            }
        });

        await logActivity({
            userId: session.user.id,
            action: 'UPDATE',
            entityType: 'Order',
            entityId: params.id,
            changes: {
                shipment: {
                    new: shipment
                }
            }
        });

        return NextResponse.json({ shipment });
    } catch (error) {
        logApiError('CREATE_SHIPMENT', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
