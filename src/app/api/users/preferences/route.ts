import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const updatePreferencesSchema = z.object({
    theme: z.enum(['DEFAULT', 'OCEAN', 'FOREST', 'SUNSET']).optional(),
    emailNotifications: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get or create user preferences
        let preferences = await prisma.userPreferences.findUnique({
            where: { userId: session.user.id },
        });

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await prisma.userPreferences.create({
                data: {
                    id: randomUUID(),
                    userId: session.user.id,
                    theme: 'DEFAULT',
                    emailNotifications: true,
                    updatedAt: new Date(),
                },
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        logApiError('Error fetching preferences:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validationResult = updatePreferencesSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { theme, emailNotifications } = validationResult.data;

        // Get or create preferences
        let preferences = await prisma.userPreferences.findUnique({
            where: { userId: session.user.id },
        });

        if (!preferences) {
            // Create if doesn't exist
            preferences = await prisma.userPreferences.create({
                data: {
                    id: randomUUID(),
                    userId: session.user.id,
                    theme: theme || 'DEFAULT',
                    emailNotifications: emailNotifications ?? true,
                    updatedAt: new Date(),
                },
            });
        } else {
            // Update existing preferences
            preferences = await prisma.userPreferences.update({
                where: { userId: session.user.id },
                data: {
                    ...(theme && { theme }),
                    ...(emailNotifications !== undefined && { emailNotifications }),
                    updatedAt: new Date(),
                },
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        logApiError('Error updating preferences:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
