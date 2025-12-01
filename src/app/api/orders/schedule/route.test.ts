
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { GET } from './route';
import { PATCH } from '../[id]/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock getServerSession
jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({
        user: {
            id: 'test-user-id',
            role: 'MANAGER'
        }
    }),
    authOptions: {}
}));

// Mock audit logger
jest.mock('@/lib/audit-logger', () => ({
    logActivity: jest.fn()
}));

// Mock api logger
jest.mock('@/lib/api-logger', () => ({
    logApiError: jest.fn()
}));

import { randomUUID } from 'crypto';

// ... (mocks remain)

describe('Schedule API', () => {
    let customerId: string;
    let locationId: string;
    let productId: string;
    let orderId: string;

    beforeAll(async () => {
        // Generate random IDs
        customerId = `test-customer-${randomUUID()}`;
        locationId = `test-location-${randomUUID()}`;
        productId = `test-product-${randomUUID()}`;
        orderId = `test-order-${randomUUID()}`;

        // Create test data
        const customer = await prisma.customer.create({
            data: {
                id: customerId,
                name: 'Test Customer Schedule',
                email: `test-schedule-${randomUUID()}@example.com`,
            }
        });

        const location = await prisma.location.create({
            data: {
                id: locationId,
                code: `TEST-${randomUUID().substring(0, 8)}`,
                name: 'Test Location Schedule',
                address: '123 Test St',
            }
        });

        const product = await prisma.product.create({
            data: {
                id: productId,
                name: 'Test Product Schedule',
                sku: `TEST-SKU-${randomUUID()}`,
                basePrice: 100,
                category: 'Test',
            }
        });
    });

    afterAll(async () => {
        // Cleanup
        try {
            if (orderId) {
                await prisma.orderItem.deleteMany({ where: { orderId: orderId } });
                await prisma.order.deleteMany({ where: { id: orderId } });
            }
            if (productId) await prisma.product.deleteMany({ where: { id: productId } });
            if (locationId) await prisma.location.deleteMany({ where: { id: locationId } });
            if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
        await prisma.$disconnect();
    });

    it('should create an order, fetch it via schedule API, and update it', async () => {
        console.log('Starting test...');
        // 1. Create Order
        await prisma.order.create({
            data: {
                id: orderId,
                orderNumber: `ORD-${randomUUID()}`,
                customerId: customerId,
                locationId: locationId,
                totalAmount: 100,
                subtotal: 100,
                status: 'PENDING',
                deliveryDate: new Date('2025-12-01T12:00:00Z'),
                fulfillmentType: 'DELIVERY',
                OrderItem: {
                    create: {
                        id: `test-order-item-${randomUUID()}`,
                        productId: productId,
                        quantity: 1,
                        price: 100,
                    }
                }
            }
        });
        console.log('Order created');

        // 2. Test GET /api/orders/schedule
        const url = new URL('http://localhost/api/orders/schedule');
        url.searchParams.set('start', '2025-12-01');
        url.searchParams.set('end', '2025-12-01');
        
        const req = new NextRequest(url);
        const res = await GET(req);
        const data = await res.json();
        console.log('GET response:', data);

        expect(res.status).toBe(200);
        expect(data.orders).toBeDefined();
        expect(data.orders.length).toBeGreaterThan(0);
        const foundOrder = data.orders.find((o: any) => o.id === orderId);
        expect(foundOrder).toBeDefined();
        expect(foundOrder.fulfillmentType).toBe('DELIVERY');

        // 3. Test PATCH /api/orders/[id]
        const updateBody = {
            items: [{ productId: productId, quantity: 2 }],
            deliveryDate: '2025-12-02',
            fulfillmentType: 'PICKUP'
        };

        const patchReq = new NextRequest(`http://localhost/api/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody)
        });

        const patchRes = await PATCH(patchReq, { params: { id: orderId } });
        const patchData = await patchRes.json();
        console.log('PATCH response:', patchData);

        expect(patchRes.status).toBe(200);
        expect(patchData.success).toBe(true);

        const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
        expect(updatedOrder?.deliveryDate?.toISOString().startsWith('2025-12-02')).toBe(true);
        expect(updatedOrder?.fulfillmentType).toBe('PICKUP');
    });
});
