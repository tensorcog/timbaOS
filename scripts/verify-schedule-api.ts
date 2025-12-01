
import { GET } from '../src/app/api/orders/schedule/route';
import { PATCH } from '../src/app/api/orders/[id]/route';
import prisma from '../src/lib/prisma';
import { NextRequest } from 'next/server';

// Mock getServerSession
jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({
        user: {
            id: 'test-user-id',
            role: 'MANAGER'
        }
    })
}));

// Mock audit logger
jest.mock('../src/lib/audit-logger', () => ({
    logActivity: jest.fn()
}));

// Mock api logger
jest.mock('../src/lib/api-logger', () => ({
    logApiError: jest.fn()
}));

async function main() {
    console.log('Starting verification...');

    // 1. Create test data
    const customer = await prisma.customer.create({
        data: {
            id: 'test-customer-schedule',
            name: 'Test Customer Schedule',
            email: 'test-schedule@example.com',
        }
    });

    const location = await prisma.location.create({
        data: {
            id: 'test-location-schedule',
            code: 'TEST-SCH',
            name: 'Test Location Schedule',
            address: '123 Test St',
        }
    });

    const product = await prisma.product.create({
        data: {
            id: 'test-product-schedule',
            name: 'Test Product Schedule',
            sku: 'TEST-SKU-SCH',
            basePrice: 100,
            category: 'Test',
        }
    });

    const order = await prisma.order.create({
        data: {
            id: 'test-order-schedule',
            orderNumber: 'ORD-TEST-SCH',
            customerId: customer.id,
            locationId: location.id,
            totalAmount: 100,
            subtotal: 100,
            status: 'PENDING',
            deliveryDate: new Date('2025-12-01'),
            fulfillmentType: 'DELIVERY',
            OrderItem: {
                create: {
                    id: 'test-order-item-schedule',
                    productId: product.id,
                    quantity: 1,
                    price: 100,
                }
            }
        }
    });

    try {
        // 2. Test GET /api/orders/schedule
        console.log('Testing GET /api/orders/schedule...');
        const url = new URL('http://localhost/api/orders/schedule');
        url.searchParams.set('start', '2025-12-01');
        url.searchParams.set('end', '2025-12-01');
        
        const req = new NextRequest(url);
        const res = await GET(req);
        const data = await res.json();

        if (data.orders && data.orders.length > 0 && data.orders[0].id === order.id) {
            console.log('✅ GET /api/orders/schedule returned correct order');
        } else {
            console.error('❌ GET /api/orders/schedule failed', data);
        }

        // 3. Test PATCH /api/orders/[id]
        console.log('Testing PATCH /api/orders/[id]...');
        const updateBody = {
            items: [{ productId: product.id, quantity: 2 }],
            deliveryDate: '2025-12-02',
            fulfillmentType: 'PICKUP'
        };

        const patchReq = new NextRequest(`http://localhost/api/orders/${order.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody)
        });

        const patchRes = await PATCH(patchReq, { params: { id: order.id } });
        const patchData = await patchRes.json();

        if (patchData.success) {
            const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
            if (updatedOrder?.deliveryDate?.toISOString().startsWith('2025-12-02') && updatedOrder?.fulfillmentType === 'PICKUP') {
                console.log('✅ PATCH /api/orders/[id] updated delivery fields correctly');
            } else {
                console.error('❌ PATCH /api/orders/[id] failed to update fields', updatedOrder);
            }
        } else {
            console.error('❌ PATCH /api/orders/[id] failed', patchData);
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Cleanup
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
        await prisma.product.delete({ where: { id: product.id } });
        await prisma.location.delete({ where: { id: location.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
        await prisma.$disconnect();
    }
}

main();
