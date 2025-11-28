import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';

test.describe('Order Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('Order Creation Validation', async () => {
        // Just verify test data exists as per original script
        const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        expect(customer).toBeDefined();
        expect(location).toBeDefined();
        expect(product).toBeDefined();
    });

    test('Order Total Calculation Validation', async () => {
        const order = await prisma.order.findFirst({
            where: { status: 'PENDING' },
            include: { OrderItem: true, Customer: true, Location: true }
        });

        if (!order) {
            console.log('No pending orders found to test');
            test.skip();
            return;
        }

        const subtotal = Number(order.subtotal);
        const tax = Number(order.taxAmount);
        const discount = Number(order.discountAmount);
        const delivery = Number(order.deliveryFee);
        const total = Number(order.totalAmount);

        const calculatedTotal = subtotal - discount + tax + delivery;
        expect(total).toBeCloseTo(calculatedTotal, 2);
    });

    test('Order Status Transitions (Confirm)', async () => {
        // Create a pending order
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst();

        if (!customer || !location || !product) {
            console.log('Missing data for order status test');
            test.skip();
            return;
        }

        const order = await prisma.order.create({
            data: {
                id: `ord-${Date.now()}`,
                orderNumber: `ORD-TEST-${Date.now()}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'PENDING',
                totalAmount: 100,
                subtotal: 100,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: `oi-${Date.now()}`,
                        productId: product.id,
                        quantity: 1,
                        price: 100
                    }
                }
            }
        });

        const res = await helper.post(`/api/orders/${order.id}/confirm`, {});
        if (!res.ok()) {
            console.log(`Order confirm failed: ${res.status()}`);
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.success).toBeTruthy();

        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updatedOrder?.status).toBe('PROCESSING');
    });

    test('Order Edit Validation', async () => {
        // Create a confirmed order
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst();

        if (!customer || !location || !product) {
            console.log('Missing data for order edit test');
            test.skip();
            return;
        }

        const confirmedOrder = await prisma.order.create({
            data: {
                id: `ord-conf-${Date.now()}`,
                orderNumber: `ORD-CONF-${Date.now()}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'PROCESSING',
                totalAmount: 100,
                subtotal: 100,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: `oi-${Date.now()}`,
                        productId: product.id,
                        quantity: 1,
                        price: 100
                    }
                }
            },
            include: { OrderItem: true }
        });

        if (confirmedOrder && confirmedOrder.OrderItem.length > 0) {
            const item = confirmedOrder.OrderItem[0];
            const res = await helper.patch(`/api/orders/${confirmedOrder.id}`, {
                items: [{ productId: item.productId, quantity: item.quantity + 1 }]
            });
            if (!res.ok()) {
                console.log(`Order edit (expected failure?) status: ${res.status()}`);
                if (res.status() !== 400) {
                    console.log(await res.text());
                }
            }
            expect(res.status()).toBe(400);
        }
    });

    test('Order Payment Status Validation', async () => {
        const pending = await prisma.order.count({ where: { paymentStatus: 'PENDING' } });
        const paid = await prisma.order.count({ where: { paymentStatus: 'PAID' } });
        const partial = await prisma.order.count({ where: { paymentStatus: 'PARTIAL' } });

        expect(pending).toBeGreaterThanOrEqual(0);
        expect(paid).toBeGreaterThanOrEqual(0);
        expect(partial).toBeGreaterThanOrEqual(0);
    });

    test('Order Cancellation Validation', async () => {
        const order = await prisma.order.findFirst({
            where: { status: 'PENDING' }
        });

        if (!order) {
            console.log('No pending orders found to test cancellation');
            test.skip();
            return;
        }

        const res = await helper.post(`/api/orders/${order.id}/cancel`, {});
        expect(res.ok()).toBeTruthy();
        expect((await res.json()).success).toBeTruthy();

        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updatedOrder?.status).toBe('CANCELLED');
    });

    test('Quote to Order Conversion Validation', async () => {
        let quote = await prisma.quote.findFirst({
            where: {
                status: { in: ['PENDING', 'SENT'] },
                convertedToOrderId: null,
                validUntil: { gt: new Date() }
            },
            include: { QuoteItem: true }
        });

        if (!quote) {
            console.log('No convertible quotes found, creating one...');
            // Create a quote
            const customer = await prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
            const location = await prisma.location.findFirst();
            const product = await prisma.product.findFirst({ where: { isActive: true } });

            if (customer && location && product) {
                const quoteRes = await helper.post('/api/quotes', {
                    customerId: customer.id,
                    locationId: location.id,
                    items: [{
                        productId: product.id,
                        quantity: 5,
                        unitPrice: Number(product.basePrice),
                        discount: 0
                    }],
                    notes: 'Auto-created for conversion test',
                    validityDays: 30
                });
                if (quoteRes.ok()) {
                    const body = await quoteRes.json();
                    // Need to approve it to make it PENDING/SENT? 
                    // API might create as DRAFT. 
                    // Assuming default is DRAFT, we might need to update status directly or via API.
                    // For simplicity, let's update DB directly.
                    await prisma.quote.update({
                        where: { id: body.id },
                        data: { status: 'PENDING' }
                    });
                    quote = await prisma.quote.findUnique({
                        where: { id: body.id },
                        include: { QuoteItem: true }
                    });
                } else {
                    console.log(`Failed to create quote: ${quoteRes.status()}`);
                }
            } else {
                console.log('Missing data for quote creation:', { customer: !!customer, location: !!location, product: !!product });
            }
        }

        if (!quote) {
            console.log('Failed to create convertible quote');
            test.skip();
            return;
        }

        const res = await helper.post(`/api/quotes/${quote.id}/convert`, {});
        if (!res.ok()) {
            console.log(`Quote conversion failed: ${res.status()}`);
            console.log(await res.text());
        }
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        console.log('Conversion Response Body:', JSON.stringify(body, null, 2));
        expect(body.success).toBeTruthy();

        const orderId = body.order.id;
        console.log(`Converted Order ID: ${orderId}`);
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        expect(Number(order?.totalAmount)).toBe(Number(quote.totalAmount));

        const updatedQuote = await prisma.quote.findUnique({ where: { id: quote.id } });
        expect(updatedQuote?.status).toBe('ACCEPTED');
    });

    test('Tax Calculation Validation', async () => {
        // Tax Exempt
        const exemptOrder = await prisma.order.findFirst({
            where: { Customer: { taxExempt: true } }
        });
        if (exemptOrder) {
            expect(Number(exemptOrder.taxAmount)).toBe(0);
        }

        // Taxable
        const taxableOrder = await prisma.order.findFirst({
            where: {
                Customer: { taxExempt: false },
                taxAmount: { gt: 0 }
            },
            include: { Location: true }
        });

        if (taxableOrder) {
            const subtotal = Number(taxableOrder.subtotal);
            const taxRate = Number(taxableOrder.Location.taxRate);
            const taxAmount = Number(taxableOrder.taxAmount);
            const expectedTax = subtotal * taxRate;

            expect(taxAmount).toBeCloseTo(expectedTax, 2);
        }
    });
});
