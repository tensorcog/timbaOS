import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processAndSaveImage, deleteImage } from '@/lib/upload-handler';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('profilePicture') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Process and save the image
        const profilePicturePath = await processAndSaveImage(file, 'profiles', {
            width: 300,
            height: 300,
        });

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Delete old profile picture if exists
        if (user.profilePicture) {
            await deleteImage(user.profilePicture);
        }

        // Update user profile picture
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { profilePicture: profilePicturePath },
        });

        return NextResponse.json({ profilePicture: updatedUser.profilePicture });
    } catch (error: any) {
        console.error('Profile picture upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload profile picture' },
            { status: 500 }
        );
    }
}
