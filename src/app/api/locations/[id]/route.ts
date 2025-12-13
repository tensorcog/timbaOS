import { logApiError } from '@/lib/api-logger';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const location = await prisma.location.findUnique({
            where: {
                id: params.id,
            },
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json(location);
    } catch (error) {
        logApiError('Error fetching location:', error);
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name, address, city, state, zipCode, phone, isWarehouse, taxRate, isActive } = body;

        const location = await prisma.location.update({
            where: {
                id: params.id,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(zipCode !== undefined && { zipCode }),
                ...(phone !== undefined && { phone }),
                ...(isWarehouse !== undefined && { isWarehouse }),
                ...(taxRate !== undefined && { taxRate }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json(location);
    } catch (error) {
        logApiError('Error updating location:', error);
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Soft delete by setting isActive to false
        const location = await prisma.location.update({
            where: {
                id: params.id,
            },
            data: {
                isActive: false,
            },
        });

        return NextResponse.json(location);
    } catch (error) {
        logApiError('Error deleting location:', error);
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
    }
}
