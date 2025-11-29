import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processAndSaveImage, deleteImage } from '@/lib/upload-handler';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can upload company logo
        const userRole = session.user.role as UserRole;
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.LOCATION_ADMIN) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('logo') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Process and save the image
        const logoPath = await processAndSaveImage(file, 'company', {
            width: 400,
            height: 400,
        });

        // Get or create company settings
        let companySettings = await prisma.companySettings.findFirst();
        
        if (companySettings) {
            // Delete old logo if exists
            if (companySettings.logo) {
                await deleteImage(companySettings.logo);
            }
            
            // Update existing settings
            companySettings = await prisma.companySettings.update({
                where: { id: companySettings.id },
                data: { logo: logoPath },
            });
        } else {
            // Create new settings
            companySettings = await prisma.companySettings.create({
                data: {
                    id: randomBytes(16).toString('hex'),
                    companyName: 'Pine ERP',
                    logo: logoPath,
                },
            });
        }

        return NextResponse.json({ logo: logoPath });
    } catch (error: any) {
        console.error('Company logo upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload logo' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const companySettings = await prisma.companySettings.findFirst();
        return NextResponse.json(companySettings || {});
    } catch (error) {
        console.error('Failed to fetch company settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}
