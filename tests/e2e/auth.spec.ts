import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

test.describe('Authentication Flows', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
    });

    test('Forgot Password - Request Reset Link', async () => {
        // 1. Create a test user
        const email = `forgot-${Date.now()}@test.com`;
        const user = await prisma.user.create({
            data: {
                id: `user-${Date.now()}`,
                name: 'Forgot Password Test',
                email: email,
                password: 'hashedpassword123', // Dummy hash
                role: 'SALES',
                updatedAt: new Date()
            }
        });

        // 2. Request reset
        const res = await helper.post('/api/auth/forgot-password', { email });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.message).toContain('reset link');

        // 3. Verify token created in DB
        const token = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id, used: false }
        });
        expect(token).toBeDefined();
        expect(token?.token).toBeDefined();

        // Cleanup
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    });

    test('Reset Password - Success Flow', async () => {
        // 1. Create user
        const email = `reset-${Date.now()}@test.com`;
        const oldPassword = 'oldpassword123';
        const newPassword = 'newpassword123';

        // Create user via helper or direct DB? Direct DB is faster for setup
        // But we need a valid hash for login test. 
        // Let's just create user and token directly.

        const user = await prisma.user.create({
            data: {
                id: `user-reset-${Date.now()}`,
                name: 'Reset Password Test',
                email: email,
                password: 'oldhash',
                role: 'SALES',
                updatedAt: new Date()
            }
        });

        const tokenString = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await prisma.passwordResetToken.create({
            data: {
                id: randomBytes(16).toString('hex'),
                userId: user.id,
                token: tokenString,
                expiresAt: expiresAt
            }
        });

        // 2. Reset password
        const res = await helper.post('/api/auth/reset-password', {
            token: tokenString,
            password: newPassword
        });

        if (!res.ok()) {
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();

        // 3. Verify token marked as used
        const usedToken = await prisma.passwordResetToken.findFirst({
            where: { token: tokenString }
        });
        expect(usedToken?.used).toBeTruthy();

        // 4. Verify password changed (by checking it's not the old hash)
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        expect(updatedUser?.password).not.toBe('oldhash');

        // Cleanup
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    });

    test('Reset Password - Invalid Token', async () => {
        const res = await helper.post('/api/auth/reset-password', {
            token: 'invalid-token',
            password: 'newpassword123'
        });
        expect(res.status()).toBe(400);
    });
});
