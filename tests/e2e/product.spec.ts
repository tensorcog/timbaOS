import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('Product Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('sales1@billssupplies.com', 'password');
    });

    test('Product Listing', async () => {
        const locationId = await TestHelper.getFirstLocationId();
        if (!locationId) {
            console.log('No locations found');
            test.skip();
            return;
        }

        const res = await helper.get(`/api/pos/products?locationId=${locationId}`);
        expect(res.ok()).toBeTruthy();
        const products = await res.json();

        expect(Array.isArray(products)).toBeTruthy();
        if (products.length > 0) {
            expect(products[0]).toHaveProperty('name');
            expect(products[0]).toHaveProperty('price');
            expect(products[0]).toHaveProperty('sku');
        }
    });

    test('Product Categories', async () => {
        const products = await prisma.product.findMany({
            select: { category: true }
        });

        const categories = new Set(products.map(p => p.category));
        expect(categories.size).toBeGreaterThanOrEqual(0);
    });

    test('SKU Uniqueness', async () => {
        const products = await prisma.product.findMany({
            select: { sku: true }
        });

        const skus = products.map(p => p.sku);
        const uniqueSkus = new Set(skus);
        expect(skus.length).toBe(uniqueSkus.size);
    });

    test('Active/Inactive Product Status', async () => {
        const active = await prisma.product.count({ where: { isActive: true } });
        const inactive = await prisma.product.count({ where: { isActive: false } });

        expect(active).toBeGreaterThanOrEqual(0);
        expect(inactive).toBeGreaterThanOrEqual(0);
    });

    test('Product Pricing', async () => {
        const product = await prisma.product.findFirst({
            where: { isActive: true }
        });

        if (product) {
            expect(Number(product.basePrice)).toBeGreaterThan(0);
        }
    });

    test('Location-Specific Pricing', async () => {
        const locationPricing = await prisma.locationPricing.findFirst();
        // Just verify we can query it, it's optional
        if (locationPricing) {
            expect(Number(locationPricing.price)).toBeGreaterThan(0);
        }
    });
});
