'use server';

import prisma from "@/lib/prisma";
import { TransferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTransfer(formData: FormData) {
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

    // Get a user to attribute this request to (mocking auth for now)
    const user = await prisma.user.findFirst();
    if (!user) {
        throw new Error('No user found to attribute transfer to');
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
            items: {
                create: items.map(item => ({
                    productId: item.productId,
                    requestedQty: item.quantity,
                })),
            },
        },
    });

    revalidatePath('/dashboard/transfers');
    redirect('/dashboard/transfers');
}
