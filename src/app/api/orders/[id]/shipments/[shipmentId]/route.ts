import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { logApiError } from '@/lib/api-logger';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; shipmentId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scheduledDate, method, carrier, trackingNumber, status } = body;

        // Get existing shipment
        const existingShipment = await prisma.shipment.findUnique({
            where: { id: params.shipmentId },
            include: { ShipmentItem: true }
        });

        if (!existingShipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        if (existingShipment.orderId !== params.id) {
            return NextResponse.json({ error: 'Shipment does not belong to this order' }, { status: 403 });
        }

        // Prevent editing shipped/delivered shipments
        if (existingShipment.status === 'SHIPPED' || existingShipment.status === 'DELIVERED') {
            return NextResponse.json({ 
                error: 'Cannot edit shipped or delivered shipments' 
            }, { status: 400 });
        }

        // Validate and parse scheduled date if provided
        let parsedDate: Date | undefined = undefined;
        if (scheduledDate !== undefined) {
            if (!scheduledDate.includes('T')) {
                parsedDate = new Date(`${scheduledDate}T00:00:00.000Z`);
            } else if (!scheduledDate.endsWith('Z') && !scheduledDate.includes('+') && !scheduledDate.includes('-', 10)) {
                return NextResponse.json({
                    error: 'scheduledDate must include timezone or be a date-only string'
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

        // Update shipment
        const updatedShipment = await prisma.shipment.update({
            where: { id: params.shipmentId },
            data: {
                ...(scheduledDate !== undefined && { scheduledDate: parsedDate }),
                ...(method && { method }),
                ...(carrier !== undefined && { carrier }),
                ...(trackingNumber !== undefined && { trackingNumber }),
                ...(status && { status })
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
            resourceType: 'ORDER',
            resourceId: params.id,
            details: `Updated shipment ${params.shipmentId}`,
            changes: {
                old: existingShipment,
                new: updatedShipment
            }
        });

        return NextResponse.json({ shipment: updatedShipment });
    } catch (error) {
        logApiError('UPDATE_SHIPMENT', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; shipmentId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get existing shipment
        const existingShipment = await prisma.shipment.findUnique({
            where: { id: params.shipmentId }
        });

        if (!existingShipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        if (existingShipment.orderId !== params.id) {
            return NextResponse.json({ error: 'Shipment does not belong to this order' }, { status: 403 });
        }

        // Only allow deleting PENDING or SCHEDULED shipments
        if (existingShipment.status === 'SHIPPED' || existingShipment.status === 'DELIVERED') {
            return NextResponse.json({ 
                error: 'Cannot delete shipped or delivered shipments. Cancel instead.' 
            }, { status: 400 });
        }

        // Delete shipment (cascade will delete ShipmentItems)
        await prisma.shipment.delete({
            where: { id: params.shipmentId }
        });

        await logActivity({
            userId: session.user.id,
            action: 'DELETE',
            resourceType: 'ORDER',
            resourceId: params.id,
            details: `Deleted shipment ${params.shipmentId}`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logApiError('DELETE_SHIPMENT', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
