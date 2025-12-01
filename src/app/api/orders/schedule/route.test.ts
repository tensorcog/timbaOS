
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { GET } from './route';
import { PATCH } from '../[id]/route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

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

    it('should create an order, create a shipment, and verify OCC', async () => {
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

        // 2. Create Shipment via API (Mocking the POST request logic here for simplicity or using the actual route if possible, but route is NextRequest based)
        // Let's use Prisma directly to simulate the API effect for the Schedule test part, 
        // and then test the OCC part on the Order.
        
        console.log('Prisma keys:', Object.keys(prisma));
        console.log('Prisma prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(prisma)));
        console.log('Prisma client path:', require.resolve('@prisma/client'));
        
        const shipmentId = `test-shipment-${randomUUID()}`;
        await (prisma as any).shipment.create({
            data: {
                id: shipmentId,
                orderId: orderId,
                scheduledDate: new Date('2025-12-01T12:00:00Z'),
                status: 'SCHEDULED',
                method: 'DELIVERY',
            }
        });
        console.log('Shipment created');

        // 3. Test GET /api/orders/schedule (Should return the shipment)
        const url = new URL('http://localhost/api/orders/schedule');
        url.searchParams.set('start', '2025-12-01T00:00:00Z');
        url.searchParams.set('end', '2025-12-01T23:59:59Z');
        
        const req = new NextRequest(url);
        const res = await GET(req);
        const data = await res.json();
        console.log('GET response:', data);

        expect(res.status).toBe(200);
        expect(data.shipments).toBeDefined();
        expect(data.shipments.length).toBeGreaterThan(0);
        const foundShipment = data.shipments.find((s: any) => s.id === shipmentId);
        expect(foundShipment).toBeDefined();
        expect(foundShipment.method).toBe('DELIVERY');

        // 4. Test OCC on Order Update
        // Fetch current order to get version
        const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
        const currentVersion = currentOrder?.version ?? 0;
        console.log('Current Version:', currentVersion);

        // First update (success)
        const updateBody1 = {
            version: currentVersion,
            items: [] // No item changes
        };
        const patchReq1 = new NextRequest(`http://localhost/api/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody1)
        });
        const patchRes1 = await PATCH(patchReq1, { params: { id: orderId } });
        const patchData1 = await patchRes1.json();
        console.log('PATCH 1 Response:', patchData1);
        
        expect(patchRes1.status).toBe(200);
        expect(patchData1.order.version).toBe(currentVersion + 1);

        // Second update with STALE version (failure)
        const updateBody2 = {
            version: currentVersion, // Stale! (Should be currentVersion + 1 now)
            items: []
        };
        const patchReq2 = new NextRequest(`http://localhost/api/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody2)
        });
        const patchRes2 = await PATCH(patchReq2, { params: { id: orderId } });
        expect(patchRes2.status).toBe(409);
    });
});
