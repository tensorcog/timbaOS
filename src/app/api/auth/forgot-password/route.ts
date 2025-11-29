import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
    // Apply strict rate limiting to prevent abuse
    const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH);
    if (rateLimitResult.limited) {
        return rateLimitResult.response!;
    }

    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Always return success to prevent email enumeration
        // But only send email if user exists
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, name: true, email: true },
        });

        if (user) {
            // Generate secure random token
            const tokenBytes = randomBytes(32);
            const token = tokenBytes.toString('hex');

            // Token expires in 1 hour
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            // Create password reset token
            await prisma.passwordResetToken.create({
                data: {
                    id: randomBytes(16).toString('hex'),
                    userId: user.id,
                    token,
                    expiresAt,
                },
            });

            // Build reset link
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            // Send email
            const result = await sendPasswordResetEmail({
                email: user.email,
                resetLink,
                userName: user.name,
            });

            if (!result.success) {
                logApiError('Failed to send password reset email:', result.error);
                // Still return success to user to prevent enumeration
            }
        }

        // Always return success (security best practice)
        return NextResponse.json({
            message: 'If an account exists with that email, you will receive a password reset link shortly.',
        });

    } catch (error) {
        logApiError('Forgot password error:', error);
        return NextResponse.json(
            { error: 'An error occurred processing your request' },
            { status: 500 }
        );
    }
}
