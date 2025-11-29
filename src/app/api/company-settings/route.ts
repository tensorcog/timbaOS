import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function GET() {
    try {
        const companySettings = await prisma.companySettings.findFirst();
        return NextResponse.json(companySettings || null);
    } catch (error) {
        console.error('Failed to fetch company settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can update company settings
        const userRole = session.user.role as UserRole;
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.LOCATION_ADMIN) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { companyName, address, phone, email, taxId, website } = body;

        // Get or create company settings
        let companySettings = await prisma.companySettings.findFirst();

        if (companySettings) {
            companySettings = await prisma.companySettings.update({
                where: { id: companySettings.id },
                data: {
                    companyName,
                    address,
                    phone,
                    email,
                    taxId,
                    website,
                },
            });
        } else {
            companySettings = await prisma.companySettings.create({
                data: {
                    id: randomBytes(16).toString('hex'),
                    companyName: companyName || 'Pine ERP',
                    address,
                    phone,
                    email,
                    taxId,
                    website,
                },
            });
        }

        return NextResponse.json(companySettings);
    } catch (error) {
        console.error('Failed to update company settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
