import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkLocationAccess } from "@/lib/permissions";
import { randomBytes } from "crypto";

// GET /api/appointments - List appointments with filtering
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        const locationId = searchParams.get("locationId");
        const customerId = searchParams.get("customerId");
        const status = searchParams.get("status");

        // Build where clause
        const where: any = {
            deletedAt: null,
        };

        // Date range filter
        if (start || end) {
            where.appointmentDate = {};
            if (start) where.appointmentDate.gte = new Date(start);
            if (end) where.appointmentDate.lte = new Date(end);
        }

        // Location filter
        if (locationId) {
            const userLocationIds = session.user.locationIds || [];
            const canAccess = checkLocationAccess(userLocationIds, locationId);
            if (!canAccess && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOCATION_ADMIN') {
                return NextResponse.json({ error: "Access denied to this location" }, { status: 403 });
            }
            where.locationId = locationId;
        } else {
            // If no specific location, filter by user's accessible locations
            const userLocations = await prisma.userLocation.findMany({
                where: { userId: session.user.id },
                select: { locationId: true },
            });
            const locationIds = userLocations.map((ul: { locationId: string }) => ul.locationId);
            if (locationIds.length > 0) {
                where.locationId = { in: locationIds };
            }
        }

        if (customerId) where.customerId = customerId;
        if (status) where.status = status;

        const appointments = await prisma.appointment.findMany({
            where,
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
            orderBy: {
                appointmentDate: "asc",
            },
        });

        return NextResponse.json({ appointments });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/appointments - Create new appointment
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, appointmentDate, duration, customerId, locationId } = body;

        // Validate required fields
        if (!title || !appointmentDate || !locationId) {
            return NextResponse.json(
                { error: "Missing required fields: title, appointmentDate, locationId" },
                { status: 400 }
            );
        }

        // Check location access
        const userLocationIds = session.user.locationIds || [];
        const canAccess = checkLocationAccess(userLocationIds, locationId);
        if (!canAccess && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOCATION_ADMIN') {
            return NextResponse.json({ error: "Access denied to this location" }, { status: 403 });
        }

        // Prevent scheduling in the past (with 1 minute buffer for clock differences)
        const appointmentDateTime = new Date(appointmentDate);
        const now = new Date();
        now.setMinutes(now.getMinutes() - 1);
        
        if (appointmentDateTime < now) {
            return NextResponse.json(
                { error: "Cannot schedule appointments in the past" },
                { status: 400 }
            );
        }

        // Validate customer if provided
        if (customerId) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId, deletedAt: null },
            });
            if (!customer) {
                return NextResponse.json({ error: "Customer not found" }, { status: 404 });
            }
        }

        const appointment = await prisma.appointment.create({
            data: {
                id: randomBytes(16).toString("hex"),
                title,
                description: description || null,
                appointmentDate: appointmentDateTime,
                duration: duration || 60,
                customerId: customerId || null,
                locationId,
                createdById: session.user.id,
            },
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

        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        console.error("Error creating appointment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
