import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/transfers - List all transfers
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const transfers = await prisma.inventoryTransfer.findMany({
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
            orderBy: {
                requestedAt: 'desc',
            },
        });

        return NextResponse.json({ transfers });
    } catch (error) {
        console.error('Error fetching transfers:', error);
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
    }
}
