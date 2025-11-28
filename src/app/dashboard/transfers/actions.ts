'use server';

import prisma from "@/lib/prisma";
import { TransferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function createTransfer(formData: FormData) {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        throw new Error('Unauthorized: You must be logged in to create transfers');
    }

    // Get the user from database using their email
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const originLocationId = formData.get('originLocationId') as string;
    const destinationLocationId = formData.get('destinationLocationId') as string;
    const notes = formData.get('notes') as string;

    // Parse items from the form data
    // Expecting items to be passed as JSON string or individual fields with indices
    // For simplicity, let's assume we'll parse a JSON string field called 'items'
    const itemsJson = formData.get('items') as string;
    const items = JSON.parse(itemsJson) as Array<{ productId: string; quantity: number }>;

    if (!originLocationId || !destinationLocationId || !items || items.length === 0) {
        throw new Error('Missing required fields');
    }

    if (originLocationId === destinationLocationId) {
        throw new Error('Origin and destination locations must be different');
    }

    const transferNumber = `TRF-${Date.now()}`;

    await prisma.inventoryTransfer.create({
        data: {
            transferNumber,
            originLocationId,
            destinationLocationId,
            status: TransferStatus.PENDING,
            requestedById: user.id,
            notes,
            updatedAt: new Date(),
            id: randomUUID(),
            TransferItem: {
                create: items.map(item => ({
                    id: randomUUID(),
                    productId: item.productId,
                    requestedQty: item.quantity,
                })),
            },
        },
    });

    revalidatePath('/dashboard/transfers');
    redirect('/dashboard/transfers');
}

export async function approveTransfer(transferId: string) {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        throw new Error('Unauthorized: You must be logged in to approve transfers');
    }

    // Get the user from database using their email
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Check if user has permission (could add role check here)
    // For now, any authenticated user can approve

    const transfer = await prisma.inventoryTransfer.findUnique({
        where: { id: transferId }
    });

    if (!transfer) {
        throw new Error('Transfer not found');
    }

    if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Only pending transfers can be approved');
    }

    await prisma.inventoryTransfer.update({
        where: { id: transferId },
        data: {
            status: TransferStatus.APPROVED,
            approvedById: user.id,
            approvedAt: new Date(),
        }
    });

    revalidatePath('/dashboard/transfers');
}

export async function rejectTransfer(transferId: string) {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        throw new Error('Unauthorized: You must be logged in to reject transfers');
    }

    // Get the user from database using their email
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const transfer = await prisma.inventoryTransfer.findUnique({
        where: { id: transferId }
    });

    if (!transfer) {
        throw new Error('Transfer not found');
    }

    if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Only pending transfers can be rejected');
    }

    await prisma.inventoryTransfer.update({
        where: { id: transferId },
        data: {
            status: TransferStatus.CANCELLED,
        }
    });

    revalidatePath('/dashboard/transfers');
}

export async function shipTransfer(transferId: string) {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        throw new Error('Unauthorized: You must be logged in to ship transfers');
    }

    const transfer = await prisma.inventoryTransfer.findUnique({
        where: { id: transferId },
        include: {
            TransferItem: true,
        }
    });

    if (!transfer) {
        throw new Error('Transfer not found');
    }

    if (transfer.status !== TransferStatus.APPROVED) {
        throw new Error('Only approved transfers can be shipped');
    }

    // Deduct inventory from origin location
    for (const item of transfer.TransferItem) {
        const inventory = await prisma.locationInventory.findFirst({
            where: {
                productId: item.productId,
                locationId: transfer.originLocationId,
            }
        });

        if (!inventory || inventory.stockLevel < item.requestedQty) {
            throw new Error(`Insufficient stock for product ${item.productId} at origin location`);
        }

        await prisma.locationInventory.update({
            where: { id: inventory.id },
            data: {
                stockLevel: inventory.stockLevel - item.requestedQty,
            }
        });
    }

    await prisma.inventoryTransfer.update({
        where: { id: transferId },
        data: {
            status: TransferStatus.IN_TRANSIT,
            shippedAt: new Date(),
        }
    });

    revalidatePath('/dashboard/transfers');
}

export async function receiveTransfer(transferId: string) {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        throw new Error('Unauthorized: You must be logged in to receive transfers');
    }

    // Get the user from database using their email
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const transfer = await prisma.inventoryTransfer.findUnique({
        where: { id: transferId },
        include: {
            TransferItem: true,
        }
    });

    if (!transfer) {
        throw new Error('Transfer not found');
    }

    if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new Error('Only in-transit transfers can be received');
    }

    // Add inventory to destination location
    for (const item of transfer.TransferItem) {
        const inventory = await prisma.locationInventory.findFirst({
            where: {
                productId: item.productId,
                locationId: transfer.destinationLocationId,
            }
        });

        if (inventory) {
            // Update existing inventory
            await prisma.locationInventory.update({
                where: { id: inventory.id },
                data: {
                    stockLevel: inventory.stockLevel + item.requestedQty,
                }
            });
        } else {
            // Create new inventory record
            await prisma.locationInventory.create({
                data: {
                    id: randomUUID(),
                    productId: item.productId,
                    locationId: transfer.destinationLocationId,
                    stockLevel: item.requestedQty,
                    reorderPoint: 10,
                    reorderQuantity: 20, // This field might not exist in schema, need to check
                    updatedAt: new Date(),
                }
            });
        }
    }

    await prisma.inventoryTransfer.update({
        where: { id: transferId },
        data: {
            status: TransferStatus.RECEIVED,
            receivedAt: new Date(),
        }
    });

    revalidatePath('/dashboard/transfers');
}
