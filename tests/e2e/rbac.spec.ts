import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

test.describe('RBAC API Access', () => {

    test('Admin User - Full Access', async ({ request }) => {
        const helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');

        // Test analytics access
        const analyticsRes = await helper.get('/api/analytics');
        expect(analyticsRes.ok()).toBeTruthy();
        const analyticsBody = await analyticsRes.json();
        expect(analyticsBody).toHaveProperty('totalRevenue');

        // Test quotes access
        const quotesRes = await helper.get('/api/quotes');
        expect(quotesRes.ok()).toBeTruthy();
        const quotesBody = await quotesRes.json();
        expect(Array.isArray(quotesBody)).toBeTruthy();

        // Store count for comparison
    });

    test('Sales User - Limited Access', async ({ request }) => {
        // Fetch admin count first
        const adminHelper = new TestHelper(request);
        await adminHelper.login('admin@billssupplies.com', 'password');
        const adminRes = await adminHelper.get('/api/quotes');
        const adminQuotes = await adminRes.json();
        const adminCount = adminQuotes.length;

        // Then login as sales
        const helper = new TestHelper(request);
        await helper.login('sales1@billssupplies.com', 'password');

        // Test analytics access (should be blocked)
        const analyticsRes = await helper.get('/api/analytics');
        expect(analyticsRes.status()).toBe(403);

        // Test quotes access (should be limited)
        const quotesRes = await helper.get('/api/quotes');
        expect(quotesRes.ok()).toBeTruthy();
        const quotesBody = await quotesRes.json();

        // Sales should see fewer or equal quotes than admin
        const salesCount = quotesBody.length;
        console.log(`RBAC Check - Sales: ${salesCount}, Admin: ${adminCount}`);
        expect(salesCount).toBeLessThanOrEqual(adminCount);
    });

    test('Manager User - Analytics Access', async ({ request }) => {
        const helper = new TestHelper(request);
        await helper.login('amherst.manager@billssupplies.com', 'password');

        // Test analytics access (should have access)
        const analyticsRes = await helper.get('/api/analytics');
        expect(analyticsRes.ok()).toBeTruthy();

        // Test quotes access
        const quotesRes = await helper.get('/api/quotes');
        expect(quotesRes.ok()).toBeTruthy();
    });

    test('Unauthenticated Access', async ({ request }) => {
        const helper = new TestHelper(request);
        // No login

        // Test analytics access
        const analyticsRes = await helper.get('/api/analytics');
        expect(analyticsRes.status()).toBe(401);

        // Test quotes access
        const quotesRes = await helper.get('/api/quotes');
        expect(quotesRes.status()).toBe(401);
    });
});
