import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 400 }
            );
        }

        if (!password || typeof password !== 'string' || password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Find the token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { User: true },
        });

        if (!resetToken) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 400 }
            );
        }

        // Check if token has been used
        if (resetToken.used) {
            return NextResponse.json(
                { error: 'This reset link has already been used' },
                { status: 400 }
            );
        }

        // Check if token has expired
        if (new Date() > resetToken.expiresAt) {
            return NextResponse.json(
                { error: 'This reset link has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password and mark token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            // Optionally, delete all other unused tokens for this user
            prisma.passwordResetToken.deleteMany({
                where: {
                    userId: resetToken.userId,
                    used: false,
                    id: { not: resetToken.id },
                },
            }),
        ]);

        return NextResponse.json({
            message: 'Password reset successful. You can now log in with your new password.',
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'An error occurred resetting your password' },
            { status: 500 }
        );
    }
}
