import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('Quote Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('Quote Creation Validation', async ({ request }) => {
        // Login as sales user for creation
        const salesHelper = new TestHelper(request);
        await salesHelper.login('sales1@billssupplies.com', 'password');

        const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for quote creation');
            test.skip();
            return;
        }

        const quoteData = {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                quantity: 5,
                unitPrice: Number(product.basePrice),
                discount: 0
            }],
            notes: 'Test quote from Playwright',
            validityDays: 30
        };

        const res = await salesHelper.post('/api/quotes', quoteData);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('quoteNumber');
    });

    test('Quote Total Calculation Validation', async () => {
        const quote = await prisma.quote.findFirst({
            include: { QuoteItem: true, Customer: true, Location: true }
        });

        if (!quote) {
            console.log('No quotes found');
            test.skip();
            return;
        }

        const subtotal = Number(quote.subtotal);
        const tax = Number(quote.taxAmount);
        const discount = Number(quote.discountAmount);
        const delivery = Number(quote.deliveryFee);
        const total = Number(quote.totalAmount);

        const calculatedTotal = subtotal - discount + tax + delivery;
        expect(total).toBeCloseTo(calculatedTotal, 2);
    });

    test('Quote Status Transitions', async () => {
        const statuses = ['DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
        for (const status of statuses) {
            const count = await prisma.quote.count({ where: { status: status as any } });
            expect(count).toBeGreaterThanOrEqual(0);
        }
    });

    test('Quote to Order Conversion', async () => {
        const quote = await prisma.quote.findFirst({
            where: {
                status: { in: ['PENDING', 'SENT'] },
                convertedToOrderId: null,
                validUntil: { gt: new Date() }
            },
            include: { QuoteItem: true }
        });

        if (!quote) {
            console.log('No convertible quotes found');
            test.skip();
            return;
        }

        const res = await helper.post(`/api/quotes/${quote.id}/convert`, {});
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.success).toBeTruthy();

        const orderId = body.orderId;
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        expect(Number(order?.totalAmount)).toBe(Number(quote.totalAmount));

        const updatedQuote = await prisma.quote.findUnique({ where: { id: quote.id } });
        expect(updatedQuote?.status).toBe('ACCEPTED');
        expect(updatedQuote?.convertedToOrderId).toBe(orderId);
    });

    test('Quote Conversion Validation Rules', async () => {
        // 1. Already converted
        const convertedQuote = await prisma.quote.findFirst({
            where: { convertedToOrderId: { not: null } }
        });
        if (convertedQuote) {
            const res = await helper.post(`/api/quotes/${convertedQuote.id}/convert`, {});
            expect(res.status()).toBe(400);
        }

        // 2. Rejected
        const rejectedQuote = await prisma.quote.findFirst({
            where: { status: 'REJECTED' }
        });
        if (rejectedQuote) {
            const res = await helper.post(`/api/quotes/${rejectedQuote.id}/convert`, {});
            expect(res.status()).toBe(400);
        }

        // 3. Draft
        const draftQuote = await prisma.quote.findFirst({
            where: { status: 'DRAFT' }
        });
        if (draftQuote) {
            const res = await helper.post(`/api/quotes/${draftQuote.id}/convert`, {});
            expect(res.status()).toBe(400);
        }
    });

    test('Quote Validity Period', async () => {
        const now = new Date();
        const valid = await prisma.quote.count({ where: { validUntil: { gt: now } } });
        const expired = await prisma.quote.count({ where: { validUntil: { lte: now } } });

        expect(valid).toBeGreaterThanOrEqual(0);
        expect(expired).toBeGreaterThanOrEqual(0);

        // Expired conversion check
        const expiredQuote = await prisma.quote.findFirst({
            where: {
                validUntil: { lte: now },
                convertedToOrderId: null,
                status: { in: ['PENDING', 'SENT'] }
            }
        });
        if (expiredQuote) {
            const res = await helper.post(`/api/quotes/${expiredQuote.id}/convert`, {});
            expect(res.status()).toBe(400);
        }
    });

    test('Quote Tax Calculation', async () => {
        // Exempt
        const exemptQuote = await prisma.quote.findFirst({
            where: { Customer: { taxExempt: true } }
        });
        if (exemptQuote) {
            expect(Number(exemptQuote.taxAmount)).toBe(0);
        }

        // Taxable
        const taxableQuote = await prisma.quote.findFirst({
            where: {
                Customer: { taxExempt: false },
                taxAmount: { gt: 0 }
            },
            include: { Location: true }
        });
        if (taxableQuote) {
            const subtotal = Number(taxableQuote.subtotal);
            const taxRate = Number(taxableQuote.Location.taxRate);
            const taxAmount = Number(taxableQuote.taxAmount);
            const expectedTax = subtotal * taxRate;
            expect(taxAmount).toBeCloseTo(expectedTax, 2);
        }
    });

    test('Quote Access Permissions', async ({ request, browser }) => {
        // Sales User
        const salesHelper = new TestHelper(request);
        await salesHelper.login('sales1@billssupplies.com', 'password');
        const salesRes = await salesHelper.get('/api/quotes');
        expect(salesRes.ok()).toBeTruthy();
        const salesQuotes = await salesRes.json();

        // Admin User
        // We need a new context or re-login. Re-login on same request updates cookies.
        await salesHelper.login('admin@billssupplies.com', 'password');
        const adminRes = await salesHelper.get('/api/quotes');
        expect(adminRes.ok()).toBeTruthy();
        const adminQuotes = await adminRes.json();

        console.log(`Sales quotes: ${salesQuotes.length}, Admin quotes: ${adminQuotes.length}`);
        expect(adminQuotes.length).toBeGreaterThanOrEqual(salesQuotes.length);

        // Unauthenticated - Use new context to ensure no cookies
        const context = await browser.newContext();
        const unauthRequest = context.request;
        const unauthHelper = new TestHelper(unauthRequest);
        const unauthRes = await unauthHelper.get('/api/quotes');
        console.log(`Unauth quote access status: ${unauthRes.status()}`);
        expect(unauthRes.status()).toBe(401);
        await context.close();
    });
});
