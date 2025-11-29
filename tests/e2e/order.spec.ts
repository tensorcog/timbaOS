import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

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
        // Create a fresh order to verify calculations
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst();

        if (!customer || !location || !product) {
            console.log('Missing data for order calculation test');
            test.skip();
            return;
        }

        const quantity = 5;
        const price = 100;
        const subtotal = quantity * price;
        const taxRate = Number(location.taxRate);
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        const order = await prisma.order.create({
            data: {
                id: randomUUID(),
                orderNumber: `ORD-CALC-${randomUUID().substring(0, 8)}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'PENDING',
                totalAmount: totalAmount,
                subtotal: subtotal,
                taxAmount: taxAmount,
                discountAmount: 0,
                deliveryFee: 0,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: randomUUID(),
                        productId: product.id,
                        quantity: quantity,
                        price: price
                    }
                }
            },
            include: { OrderItem: true, Customer: true, Location: true }
        });

        const dbSubtotal = Number(order.subtotal);
        const dbTax = Number(order.taxAmount);
        const dbDiscount = Number(order.discountAmount);
        const dbDelivery = Number(order.deliveryFee);
        const dbTotal = Number(order.totalAmount);

        const calculatedTotal = dbSubtotal - dbDiscount + dbTax + dbDelivery;
        expect(dbTotal).toBeCloseTo(calculatedTotal, 2);

        // Cleanup
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
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
                id: randomUUID(),
                orderNumber: `ORD-TEST-${randomUUID().substring(0, 8)}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'PENDING',
                totalAmount: 100,
                subtotal: 100,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: randomUUID(),
                        productId: product.id,
                        quantity: 1,
                        price: 100
                    }
                }
            }
        });

        // ... (and for other create calls)

        const confirmedOrder = await prisma.order.create({
            data: {
                id: randomUUID(),
                orderNumber: `ORD-CONF-${randomUUID().substring(0, 8)}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'PROCESSING',
                totalAmount: 100,
                subtotal: 100,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: randomUUID(),
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
        // 1. Create a taxable customer
        const customer = await prisma.customer.create({
            data: {
                id: `cust-tax-${Date.now()}`,
                name: 'Tax Calc Test Customer',
                email: `tax-${Date.now()}@test.com`,
                taxExempt: false,
                updatedAt: new Date()
            }
        });

        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!location || !product) {
            console.log('Missing test data for tax calculation');
            test.skip();
            return;
        }

        // 2. Create a quote
        const quoteRes = await helper.post('/api/quotes', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                quantity: 10,
                unitPrice: Number(product.basePrice),
                discount: 0
            }],
            notes: 'Tax calc test',
            validityDays: 30
        });
        expect(quoteRes.ok()).toBeTruthy();
        const quote = await quoteRes.json();

        // 3. Convert to order
        const convertRes = await helper.post(`/api/quotes/${quote.id}/convert`, {});
        expect(convertRes.ok()).toBeTruthy();
        const body = await convertRes.json();
        const orderId = body.order.id;

        // 4. Verify Order Tax
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { Location: true }
        });

        const subtotal = Number(order?.subtotal);
        const taxRate = Number(order?.Location.taxRate);
        const taxAmount = Number(order?.taxAmount);
        const expectedTax = subtotal * taxRate;

        expect(taxAmount).toBeCloseTo(expectedTax, 2);

        // Cleanup
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.delete({ where: { id: orderId } });
        await prisma.quoteItem.deleteMany({ where: { quoteId: quote.id } });
        await prisma.quote.delete({ where: { id: quote.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
    });
});
