import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

test.describe('Recommendations API', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('Should return recommendations filtered by inventory', async () => {
        // 1. Setup Data
        const location = await prisma.location.findFirst();
        if (!location) throw new Error('No location found');

        // Create source product
        const sourceProduct = await prisma.product.create({
            data: {
                id: randomUUID(),
                name: 'Source Product',
                sku: `SRC-${randomUUID().substring(0, 8)}`,
                basePrice: 10,
                category: 'Test',
                isActive: true,
                updatedAt: new Date()
            }
        });

        // Create recommended product WITH stock
        const stockProduct = await prisma.product.create({
            data: {
                id: randomUUID(),
                name: 'In Stock Product',
                sku: `STK-${randomUUID().substring(0, 8)}`,
                basePrice: 20,
                category: 'Test',
                isActive: true,
                updatedAt: new Date(),
                LocationInventory: {
                    create: {
                        id: randomUUID(),
                        locationId: location.id,
                        stockLevel: 10,
                        updatedAt: new Date()
                    }
                }
            }
        });

        // Create recommended product WITHOUT stock
        const noStockProduct = await prisma.product.create({
            data: {
                id: randomUUID(),
                name: 'No Stock Product',
                sku: `NSTK-${randomUUID().substring(0, 8)}`,
                basePrice: 30,
                category: 'Test',
                isActive: true,
                updatedAt: new Date()
                // No inventory created
            }
        });

        // Create recommendations
        await prisma.productRecommendation.createMany({
            data: [
                {
                    id: randomUUID(),
                    productId: sourceProduct.id,
                    recommendedProductId: stockProduct.id,
                    strength: 0.9,
                    reason: 'High correlation',
                    updatedAt: new Date()
                },
                {
                    id: randomUUID(),
                    productId: sourceProduct.id,
                    recommendedProductId: noStockProduct.id,
                    strength: 0.8,
                    reason: 'Medium correlation',
                    updatedAt: new Date()
                }
            ]
        });

        // 2. Call API
        const res = await helper.get(`/api/recommendations?locationId=${location.id}&productIds=${sourceProduct.id}`);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        // 3. Verify Results
        // Should only contain the in-stock product
        expect(body).toHaveLength(1);
        expect(body[0].product.id).toBe(stockProduct.id);
        expect(body[0].strength).toBe(0.9);

        // 4. Cleanup
        await prisma.productRecommendation.deleteMany({
            where: { productId: sourceProduct.id }
        });
        await prisma.locationInventory.deleteMany({
            where: { productId: stockProduct.id }
        });
        await prisma.product.deleteMany({
            where: { id: { in: [sourceProduct.id, stockProduct.id, noStockProduct.id] } }
        });
    });
});
