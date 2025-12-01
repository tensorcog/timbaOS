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
        const { scheduledDate, method, carrier, trackingNumber, items } = body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
        }

        // 1. Validate all orderItemIds belong to this order
        const orderItemIds = items.map((item: any) => item.orderItemId);
        const orderItems = await prisma.orderItem.findMany({
            where: { 
                id: { in: orderItemIds },
                orderId: params.id 
            }
        });

        if (orderItems.length !== items.length) {
            return NextResponse.json({ 
                error: 'Invalid orderItemId - some items do not belong to this order' 
            }, { status: 400 });
        }

        // 2. Validate quantity constraints
        for (const item of items) {
            const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
            if (!orderItem) {
                return NextResponse.json({
                    error: `OrderItem ${item.orderItemId} not found`
                }, { status: 400 });
            }

            // Get already-shipped quantity (excluding CANCELLED shipments)
            const shippedQty = await prisma.shipmentItem.aggregate({
                where: {
                    orderItemId: item.orderItemId,
                    Shipment: { 
                        status: { notIn: ['CANCELLED'] }
                    }
                },
                _sum: { quantity: true }
            });

            const alreadyShipped = shippedQty._sum.quantity || 0;
            const available = orderItem.quantity - alreadyShipped;

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

        // 3. Validate and parse scheduled date (enforce UTC)
        let parsedDate: Date | null = null;
        if (scheduledDate) {
            if (!scheduledDate.includes('T')) {
                // Date-only string: treat as midnight UTC
                parsedDate = new Date(`${scheduledDate}T00:00:00.000Z`);
            } else if (!scheduledDate.endsWith('Z') && !scheduledDate.includes('+') && !scheduledDate.includes('-', 10)) {
                return NextResponse.json({
                    error: 'scheduledDate must include timezone (Z or +/-HH:MM) or be a date-only string (YYYY-MM-DD)'
                }, { status: 400 });
            } else {
                parsedDate = new Date(scheduledDate);
            }

            if (isNaN(parsedDate.getTime())) {
                return NextResponse.json({
                    error: 'Invalid scheduledDate format'
                }, { status: 400 });
            }
        }

        // Create shipment
        const shipment = await prisma.shipment.create({
            data: {
                id: crypto.randomUUID(),
                orderId: params.id,
                scheduledDate: parsedDate,
                method: method || 'DELIVERY',
                carrier,
                trackingNumber,
                status: 'SCHEDULED',
                ShipmentItem: {
                    create: items.map((item: any) => ({
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
