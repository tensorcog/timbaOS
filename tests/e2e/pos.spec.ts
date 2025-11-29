import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('POS Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('POS Checkout Flow', async () => {
        const location = await prisma.location.findFirst();
        const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
        const product = await prisma.product.findFirst({
            where: { isActive: true },
            include: { LocationPricing: true }
        });

        if (!location || !customer || !product) {
            console.log('Missing test data for POS checkout');
            test.skip();
            return;
        }

        const price = Number(product.LocationPricing[0]?.price || product.basePrice);
        const quantity = 3;
        const total = price * quantity;

        const checkoutData = {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                quantity: quantity,
                price: price,
                discount: 0
            }],
            payments: [{
                method: 'CASH',
                amount: total
            }]
        };

        const res = await helper.post('/api/pos/checkout', checkoutData);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const orderId = body.id;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        expect(order?.orderType).toBe('POS');
        expect(order?.paymentStatus).toBe('PAID');
        expect(order?.status).toBe('COMPLETED');
    });

    test('Walk-in Customer Creation (Singleton)', async () => {
        // First call - should create or return existing
        const res1 = await helper.post('/api/pos/customers/walk-in', {});
        expect(res1.ok()).toBeTruthy();
        const customer1 = await res1.json();

        expect(customer1.name).toBe('Walk-in Customer');
        expect(customer1.email).toBe('walk-in@pos.local');

        // Second call - should return the SAME customer
        const res2 = await helper.post('/api/pos/customers/walk-in', {});
        expect(res2.ok()).toBeTruthy();
        const customer2 = await res2.json();

        expect(customer2.id).toBe(customer1.id);
        expect(customer2.email).toBe('walk-in@pos.local');
    });

    test('Multiple Payment Methods (Split)', async () => {
        const location = await prisma.location.findFirst();
        const customer = await prisma.customer.findFirst();

        // Create a specific product to avoid floating point issues
        const product = await prisma.product.create({
            data: {
                id: `prod-${Date.now()}`,
                name: 'Split Payment Test Product',
                sku: `SPLIT-${Date.now()}`,
                category: 'TEST',
                basePrice: 100.00,
                isActive: true,
                updatedAt: new Date(),
                createdAt: new Date(),
                LocationPricing: {
                    create: [{
                        id: `lp-${Date.now()}`,
                        locationId: location!.id,
                        price: 100.00,
                        updatedAt: new Date(),
                        createdAt: new Date()
                    }]
                },
                LocationInventory: {
                    create: [{
                        id: `li-${Date.now()}`,
                        locationId: location!.id,
                        stockLevel: 100,
                        updatedAt: new Date(),
                        createdAt: new Date()
                    }]
                }
            }
        });

        if (!location || !customer || !product) {
            console.log('Missing test data for split payment');
            test.skip();
            return;
        }

        const price = 100.00;
        const total = price * 2;
        const half = total / 2;

        const checkoutData = {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                quantity: 2,
                price: price,
                discount: 0
            }],
            payments: [
                { method: 'CASH', amount: half },
                { method: 'CREDIT_CARD', amount: half }
            ]
        };

        console.log('Checkout Data:', JSON.stringify(checkoutData, null, 2));
        const res = await helper.post('/api/pos/checkout', checkoutData);
        if (!res.ok()) {
            console.log(`POS Checkout failed: ${res.status()}`);
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        const payments = await prisma.payment.count({ where: { orderId: body.id } });
        console.log(`Payments found for order ${body.id}: ${payments}`);
        expect(payments).toBe(2);

        // Cleanup
        await prisma.payment.deleteMany({ where: { orderId: body.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: body.id } });
        await prisma.order.delete({ where: { id: body.id } });
        await prisma.product.delete({ where: { id: product.id } });
    });

    test('POS Tax Calculation', async () => {
        const location = await prisma.location.findFirst();
        const customer = await prisma.customer.findFirst({ where: { taxExempt: false } });
        const inventory = await prisma.locationInventory.findFirst({
            where: {
                locationId: location?.id,
                stockLevel: { gte: 5 }
            },
            include: { Product: true }
        });

        if (!location || !customer || !inventory) {
            console.log('Missing test data for POS tax calculation');
            test.skip();
            return;
        }

        const price = Number(inventory.Product.basePrice);
        const taxRate = Number(location.taxRate);
        const expectedTax = price * taxRate;
        const total = price + expectedTax;

        const checkoutData = {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: inventory.productId,
                quantity: 1,
                price: price,
                discount: 0
            }],
            payments: [{
                method: 'CASH',
                amount: total
            }]
        };

        const res = await helper.post('/api/pos/checkout', checkoutData);
        if (!res.ok()) {
            console.log(`POS Tax Calculation failed: ${res.status()}`);
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        const order = await prisma.order.findUnique({ where: { id: body.id } });
        expect(Number(order?.taxAmount)).toBeCloseTo(expectedTax, 2);
    });

    test('POS Products Endpoint', async () => {
        const locationId = await TestHelper.getFirstLocationId();
        if (!locationId) return;

        const res = await helper.get(`/api/pos/products?locationId=${locationId}`);
        expect(res.ok()).toBeTruthy();
        const products = await res.json();

        expect(Array.isArray(products)).toBeTruthy();
        if (products.length > 0) {
            expect(products[0]).toHaveProperty('name');
            expect(products[0]).toHaveProperty('price');
        }
    });
});
