import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { POST, GET } from './route';
import { PUT, DELETE } from './[shipmentId]/route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

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

// Mock api logger
jest.mock('@/lib/api-logger', () => ({
    logApiError: jest.fn()
}));

describe('Shipment CRUD API', () => {
    let customerId: string;
    let locationId: string;
    let productId: string;
    let orderId: string;
    let orderItemId: string;
    let shipmentId: string;

    beforeAll(async () => {
        // Generate random IDs
        customerId = `test-customer-${randomUUID()}`;
        locationId = `test-location-${randomUUID()}`;
        productId = `test-product-${randomUUID()}`;
        orderId = `test-order-${randomUUID()}`;
        orderItemId = `test-order-item-${randomUUID()}`;

        // Create test customer
        await prisma.customer.create({
            data: {
                id: customerId,
                name: 'Test Customer Shipment',
                email: `test-shipment-${randomUUID()}@example.com`,
            }
        });

        // Create test location
        await prisma.location.create({
            data: {
                id: locationId,
                code: `TEST-${randomUUID().substring(0, 8)}`,
                name: 'Test Location Shipment',
                address: '123 Test St',
            }
        });

        // Create test product
        await prisma.product.create({
            data: {
                id: productId,
                name: 'Test Product Shipment',
                sku: `TEST-SKU-${randomUUID()}`,
                basePrice: 100,
                category: 'Test',
            }
        });

        // Create test order with 10 units
        await prisma.order.create({
            data: {
                id: orderId,
                orderNumber: `ORD-${randomUUID()}`,
                customerId: customerId,
                locationId: locationId,
                totalAmount: 1000,
                subtotal: 1000,
                status: 'PENDING',
                OrderItem: {
                    create: {
                        id: orderItemId,
                        productId: productId,
                        quantity: 10,
                        price: 100,
                    }
                }
            }
        });
    });

    afterAll(async () => {
        // Cleanup
        try {
            if (shipmentId) {
                await prisma.shipmentItem.deleteMany({ where: { shipmentId } });
                await prisma.shipment.deleteMany({ where: { id: shipmentId } });
            }
            if (orderId) {
                await prisma.shipmentItem.deleteMany({ where: { orderItemId } });
                await prisma.shipment.deleteMany({ where: { orderId } });
                await prisma.orderItem.deleteMany({ where: { orderId } });
                await prisma.order.deleteMany({ where: { id: orderId } });
            }            if (productId) await prisma.product.deleteMany({ where: { id: productId } });
            if (locationId) await prisma.location.deleteMany({ where: { id: locationId } });
            if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
        await prisma.$disconnect();
    });

    describe('POST /api/orders/[id]/shipments', () => {
        it('should create a valid shipment', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`, {
                method: 'POST',
                body: JSON.stringify({
                    scheduledDate: '2025-12-15',
                    method: 'DELIVERY',
                    carrier: 'UPS',
                    trackingNumber: 'TEST123',
                    items: [{ orderItemId, quantity: 5 }]
                })
            });

            const res = await POST(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.shipment).toBeDefined();
            expect(data.shipment.method).toBe('DELIVERY');
            expect(data.shipment.carrier).toBe('UPS');
            expect(data.shipment.ShipmentItem).toHaveLength(1);
            expect(data.shipment.ShipmentItem[0].quantity).toBe(5);

            shipmentId = data.shipment.id;
        });

        it('should reject shipment with items from different order', async () => {
            const otherOrderItemId = `fake-order-item-${randomUUID()}`;
            
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`, {
                method: 'POST',
                body: JSON.stringify({
                    scheduledDate: '2025-12-15',
                    method: 'DELIVERY',
                    items: [{ orderItemId: otherOrderItemId, quantity: 1 }]
                })
            });

            const res = await POST(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('do not belong to this order');
        });

        it('should reject over-shipment', async () => {
            // Try to ship 7 more units (would exceed 10 total)
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`, {
                method: 'POST',
                body: JSON.stringify({
                    scheduledDate: '2025-12-15',
                    method: 'DELIVERY',
                    items: [{ orderItemId, quantity: 7 }]
                })
            });

            const res = await POST(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('Only 5 available');
        });

        it('should enforce UTC timezone or date-only format', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`, {
                method: 'POST',
                body: JSON.stringify({
                    scheduledDate: '2025-12-15T10:00:00', // Missing timezone
                    method: 'DELIVERY',
                    items: [{ orderItemId, quantity: 1 }]
                })
            });

            const res = await POST(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('timezone');
        });

        it('should reject empty items array', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`, {
                method: 'POST',
                body: JSON.stringify({
                    scheduledDate: '2025-12-15',
                    method: 'DELIVERY',
                    items: []
                })
            });

            const res = await POST(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('At least one item');
        });
    });

    describe('GET /api/orders/[id]/shipments', () => {
        it('should fetch all shipments for an order', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments`);
            const res = await GET(req, { params: { id: orderId } });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.shipments).toBeDefined();
            expect(data.shipments.length).toBeGreaterThan(0);
            expect(data.shipments[0].ShipmentItem).toBeDefined();
        });
    });

    describe('PUT /api/orders/[id]/shipments/[shipmentId]', () => {
        it('should update shipment metadata', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments/${shipmentId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    carrier: 'FedEx',
                    trackingNumber: 'UPDATED123'
                })
            });

            const res = await PUT(req, { params: { id: orderId, shipmentId } });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.shipment.carrier).toBe('FedEx');
            expect(data.shipment.trackingNumber).toBe('UPDATED123');
        });

        it('should reject editing shipped shipments', async () => {
            // Mark shipment as SHIPPED
            await prisma.shipment.update({
                where: { id: shipmentId },
                data: { status: 'SHIPPED' }
            });

            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments/${shipmentId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    carrier: 'DHL'
                })
            });

            const res = await PUT(req, { params: { id: orderId, shipmentId } });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('Cannot edit shipped');

            // Reset for cleanup
            await prisma.shipment.update({
                where: { id: shipmentId },
                data: { status: 'SCHEDULED' }
            });
        });
    });

    describe('DELETE /api/orders/[id]/shipments/[shipmentId]', () => {
        it('should delete a pending shipment', async () => {
            const req = new NextRequest(`http://localhost/api/orders/${orderId}/shipments/${shipmentId}`, {
                method: 'DELETE'
            });

            const res = await DELETE(req, { params: { id: orderId, shipmentId } });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify deletion
            const deleted = await prisma.shipment.findUnique({ where: { id: shipmentId } });
            expect(deleted).toBeNull();

            shipmentId = ''; // Clear for cleanup
        });
    });
});
