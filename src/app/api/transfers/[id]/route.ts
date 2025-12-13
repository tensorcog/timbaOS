import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/transfers/[id] - Get transfer details
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const transfer = await prisma.inventoryTransfer.findUnique({
            where: { id: params.id },
            include: {
                Location_InventoryTransfer_originLocationIdToLocation: true,
                Location_InventoryTransfer_destinationLocationIdToLocation: true,
                TransferItem: {
                    include: {
                        Product: true,
                    },
                },
                User_InventoryTransfer_requestedByIdToUser: true,
                User_InventoryTransfer_approvedByIdToUser: true,
            },
        });

        if (!transfer) {
            return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
        }

        return NextResponse.json({ transfer });
    } catch (error) {
        console.error('Error fetching transfer:', error);
        return NextResponse.json({ error: 'Failed to fetch transfer' }, { status: 500 });
    }
}

// PATCH /api/transfers/[id] - Update transfer
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { notes } = body;

        // Get existing transfer
        const existing = await prisma.inventoryTransfer.findUnique({
            where: { id: params.id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
        }

        // Only allow editing PENDING or APPROVED transfers
        if (existing.status !== 'PENDING' && existing.status !== 'APPROVED') {
            return NextResponse.json(
                { error: 'Cannot edit transfer in current status' },
                { status: 400 }
            );
        }

        // Update transfer
        const transfer = await prisma.inventoryTransfer.update({
            where: { id: params.id },
            data: {
                notes: notes || null,
            },
            include: {
                Location_InventoryTransfer_originLocationIdToLocation: true,
                Location_InventoryTransfer_destinationLocationIdToLocation: true,
                TransferItem: {
                    include: {
                        Product: true,
                    },
                },
            },
        });

        return NextResponse.json({ transfer });
    } catch (error) {
        console.error('Error updating transfer:', error);
        return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
    }
}
