import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "LOCATION_ADMIN")) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role, isActive, locationIds } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role as UserRole;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await hash(password, 10);
        }

        // Transaction to handle user update and location assignment update
        const user = await prisma.$transaction(async (tx) => {
            // Update basic info
            const updatedUser = await tx.user.update({
                where: { id: params.id },
                data: updateData
            });

            // Update locations if provided
            if (locationIds) {
                // Remove existing assignments
                await tx.userLocation.deleteMany({
                    where: { userId: params.id }
                });

                // Create new assignments
                if (locationIds.length > 0) {
                    await tx.userLocation.createMany({
                        data: locationIds.map((locationId: string) => ({
                            id: crypto.randomUUID(),
                            userId: params.id,
                            locationId,
                            canManage: role === "LOCATION_ADMIN" || role === "SUPER_ADMIN"
                        }))
                    });
                }
            }

            return updatedUser;
        });

        const { password: _, ...result } = user;
        return NextResponse.json(result);
    } catch (error) {
        console.error("[USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SUPER_ADMIN")) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Prevent deleting self
        if (session.user.id === params.id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        // Soft delete (set inactive) instead of hard delete to preserve history
        const user = await prisma.user.update({
            where: { id: params.id },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("[USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
