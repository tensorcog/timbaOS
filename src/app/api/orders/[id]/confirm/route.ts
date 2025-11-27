import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orderId = params.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== OrderStatus.PENDING) {
            return NextResponse.json(
                { error: `Cannot confirm order with status: ${order.status}` },
                { status: 400 }
            );
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.PROCESSING,
            },
        });

        await logActivity({
            entityType: 'Order',
            entityId: orderId,
            action: 'UPDATE',
            userId: session.user.id,
            changes: {
                status: { old: order.status, new: 'CONFIRMED' },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            order: updatedOrder,
            message: `Order ${order.orderNumber} confirmed and moved to processing`,
        });

    } catch (error) {
        console.error('Confirm order error:', error);
        return NextResponse.json(
            { error: 'Failed to confirm order' },
            { status: 500 }
        );
    }
}
