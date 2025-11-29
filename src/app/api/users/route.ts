import { logApiError } from '@/lib/api-logger';
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "LOCATION_ADMIN")) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Check for showAll query parameter
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('showAll') === 'true';

        // Get selected location from cookie
        const cookieStore = cookies();
        const selectedLocationId = cookieStore.get('locationId')?.value;

        // Build filter based on showAll flag and selected location
        let locationFilter = {};
        
        if (!showAll && selectedLocationId) {
            locationFilter = {
                UserLocation: {
                    some: {
                        locationId: selectedLocationId
                    }
                }
            };
        }

        const users = await prisma.user.findMany({
            where: locationFilter,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                UserLocation: {
                    include: {
                        Location: {
                            select: {
                                name: true,
                                code: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        logApiError("[USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "LOCATION_ADMIN")) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role, locationIds } = body;

        if (!name || !email || !password || !role) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return new NextResponse("User already exists", { status: 409 });
        }

        const hashedPassword = await hash(password, 10);
        const userId = crypto.randomUUID();

        const user = await prisma.user.create({
            data: {
                id: userId,
                name,
                email,
                password: hashedPassword,
                role: role as UserRole,
                updatedAt: new Date(),
                UserLocation: {
                    create: locationIds?.map((locationId: string) => ({
                        id: crypto.randomUUID(),
                        locationId,
                        canManage: role === "LOCATION_ADMIN" || role === "SUPER_ADMIN"
                    }))
                }
            }
        });

        // Remove password from response
        const { password: _, ...result } = user;

        return NextResponse.json(result);
    } catch (error) {
        logApiError("[USERS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
