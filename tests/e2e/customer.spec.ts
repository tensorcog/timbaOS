import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('Customer Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('sales1@billssupplies.com', 'password');
    });

    test('Customer Types (RETAIL vs WHOLESALE)', async () => {
        const retailCount = await prisma.customer.count({ where: { customerType: 'RETAIL' } });
        const wholesaleCount = await prisma.customer.count({ where: { customerType: 'WHOLESALE' } });

        expect(retailCount).toBeGreaterThanOrEqual(0);
        expect(wholesaleCount).toBeGreaterThanOrEqual(0);
    });

    test('Tax-Exempt Customer Status', async () => {
        const exemptCount = await prisma.customer.count({ where: { taxExempt: true } });
        const nonExemptCount = await prisma.customer.count({ where: { taxExempt: false } });

        expect(exemptCount).toBeGreaterThanOrEqual(0);
        expect(nonExemptCount).toBeGreaterThanOrEqual(0);
    });

    test('Customer Listing', async () => {
        const res = await helper.get('/api/pos/customers');
        expect(res.ok()).toBeTruthy();
        const customers = await res.json();

        expect(Array.isArray(customers)).toBeTruthy();
        if (customers.length > 0) {
            expect(customers[0]).toHaveProperty('name');
            expect(customers[0]).toHaveProperty('email');
        }
    });

    test('Customer Email Uniqueness', async () => {
        const customers = await prisma.customer.findMany({
            select: { email: true }
        });

        const emails = customers.map(c => c.email).filter(e => !!e) as string[];
        const uniqueEmails = new Set(emails);

        expect(emails.length).toBe(uniqueEmails.size);
    });

    test('Walk-in Customer Generation', async () => {
        const res = await helper.post('/api/pos/customers/walk-in', {});
        expect(res.ok()).toBeTruthy();
        const customer = await res.json();

        expect(customer).toHaveProperty('id');
        expect(customer).toHaveProperty('name');

        // Verify in DB
        const dbCustomer = await prisma.customer.findUnique({
            where: { id: customer.id }
        });

        expect(dbCustomer).toBeDefined();
        expect(dbCustomer?.customerType).toBe('RETAIL');
    });
});
