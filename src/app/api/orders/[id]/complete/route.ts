import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus, UserRole } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Warehouse, Managers, and Admins can complete orders
        const userRole = session.user.role as UserRole;
        if (
            userRole !== UserRole.WAREHOUSE &&
            userRole !== UserRole.MANAGER &&
            userRole !== UserRole.LOCATION_ADMIN &&
            userRole !== UserRole.SUPER_ADMIN
        ) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        const orderId = params.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only allow completing PROCESSING orders
        if (order.status !== OrderStatus.PROCESSING) {
            return NextResponse.json(
                { error: `Cannot complete order with status: ${order.status}. Order must be PROCESSING.` },
                { status: 400 }
            );
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        await logActivity({
            entityType: 'Order',
            entityId: orderId,
            action: 'UPDATE',
            userId: session.user.id,
            changes: {
                status: { old: order.status, new: 'COMPLETED' },
                completedAt: { old: null, new: new Date().toISOString() },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            order: updatedOrder,
            message: `Order ${order.orderNumber} marked as completed`,
        });

    } catch (error) {
        console.error('Complete order error:', error);
        return NextResponse.json(
            { error: 'Failed to complete order' },
            { status: 500 }
        );
    }
}
