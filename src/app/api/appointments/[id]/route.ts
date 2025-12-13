import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkLocationAccess } from "@/lib/permissions";

// PATCH /api/appointments/[id] - Update appointment
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();

        // Find existing appointment
        const existing = await prisma.appointment.findUnique({
            where: { id, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }

        // Check location access
        const userLocationIds = session.user.locationIds || [];
        const canAccess = checkLocationAccess(userLocationIds, existing.locationId);
        if (!canAccess && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOCATION_ADMIN') {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Build update data
        const updateData: any = {};
        
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description || null;
        if (body.duration !== undefined) updateData.duration = body.duration;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.customerId !== undefined) updateData.customerId = body.customerId || null;

        // Handle appointment date update
        if (body.appointmentDate !== undefined) {
            const appointmentDateTime = new Date(body.appointmentDate);
            
            // For completed appointments, don't allow moving to the past
            if (existing.status === "COMPLETED") {
                const now = new Date();
                if (appointmentDateTime < now) {
                    return NextResponse.json(
                        { error: "Cannot move completed appointment to the past" },
                        { status: 400 }
                    );
                }
            }
            
            updateData.appointmentDate = appointmentDateTime;
        }

        // Update appointment
        const appointment = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                Customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                Location: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                CreatedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({ appointment });
    } catch (error) {
        console.error("Error updating appointment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/appointments/[id] - Soft delete appointment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Find existing appointment
        const existing = await prisma.appointment.findUnique({
            where: { id, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }

        // Check location access
        const userLocationIds = session.user.locationIds || [];
        const canAccess = checkLocationAccess(userLocationIds, existing.locationId);
        if (!canAccess && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOCATION_ADMIN') {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Soft delete
        await prisma.appointment.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting appointment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
