import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('User Profile & Preferences', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('Get User Profile', async () => {
        const res = await helper.get('/api/users/profile');
        expect(res.ok()).toBeTruthy();
        const profile = await res.json();

        expect(profile.email).toBe('admin@billssupplies.com');
        expect(profile.role).toBeDefined();
    });

    test('Update User Profile', async () => {
        const newName = `Admin Updated ${Date.now()}`;
        const res = await helper.patch('/api/users/profile', {
            name: newName
        });
        expect(res.ok()).toBeTruthy();
        const updated = await res.json();
        expect(updated.name).toBe(newName);

        // Verify in DB
        const user = await prisma.user.findUnique({ where: { email: 'admin@billssupplies.com' } });
        expect(user?.name).toBe(newName);

        // Revert change
        await helper.patch('/api/users/profile', { name: 'Admin User' });
    });

    test('Get User Preferences (Defaults)', async () => {
        // Ensure no prefs exist first (optional, but good for clean test)
        // Actually, admin might already have prefs from other tests or seed.
        // So we just check structure.

        const res = await helper.get('/api/users/preferences');
        if (!res.ok()) {
            console.log(`Get preferences failed: ${res.status()}`);
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();
        const prefs = await res.json();

        expect(prefs.theme).toBeDefined();
        expect(prefs.emailNotifications).toBeDefined();
    });

    test('Update User Preferences', async () => {
        const res = await helper.patch('/api/users/preferences', {
            theme: 'FOREST',
            emailNotifications: false
        });
        expect(res.ok()).toBeTruthy();
        const updated = await res.json();

        expect(updated.theme).toBe('FOREST');
        expect(updated.emailNotifications).toBe(false);

        // Verify in DB
        const user = await prisma.user.findUnique({ where: { email: 'admin@billssupplies.com' } });
        const prefs = await prisma.userPreferences.findUnique({ where: { userId: user!.id } });
        expect(prefs?.theme).toBe('FOREST');
        expect(prefs?.emailNotifications).toBe(false);
    });
});
