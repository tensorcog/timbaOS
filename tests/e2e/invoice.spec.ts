import { test, expect } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';
import prisma from '@/lib/prisma';
import PaymentTestHelper from '@/lib/payment-test-helper';

test.describe('Invoice Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ request }) => {
        helper = new TestHelper(request);
        await helper.login('admin@billssupplies.com', 'password');
    });

    test('Invoice Creation', async () => {
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for invoice creation');
            test.skip();
            return;
        }

        const res = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 5,
                unitPrice: Number(product.basePrice),
                discount: 0
            }],
            notes: 'Test invoice',
            paymentTermDays: 30
        });

        if (!res.ok()) {
            console.log(`Invoice creation failed: ${res.status()}`);
            const text = await res.text();
            console.log('Response:', text.substring(0, 500));
            expect(res.ok()).toBeTruthy();
            return;
        }

        const invoice = await res.json();

        expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
        expect(invoice.status).toBe('DRAFT');
        expect(Number(invoice.balanceDue)).toBe(Number(invoice.totalAmount));
        expect(Number(invoice.paidAmount)).toBe(0);
    });

    test('Invoice Total Calculation', async () => {
        const customer = await prisma.customer.findFirst({ where: { taxExempt: false } });
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for invoice calculation');
            test.skip();
            return;
        }

        const quantity = 10;
        const unitPrice = Number(product.basePrice);
        const discount = 5;

        const res = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: quantity,
                unitPrice: unitPrice,
                discount: discount
            }],
            deliveryFee: 10
        });

        expect(res.ok()).toBeTruthy();
        const invoice = await res.json();

        const expectedSubtotal = (quantity * unitPrice) - discount;
        const taxRate = Number(location.taxRate);
        const expectedTax = expectedSubtotal * taxRate;
        const expectedTotal = expectedSubtotal + expectedTax + 10;

        expect(Number(invoice.subtotal)).toBeCloseTo(expectedSubtotal, 2);
        expect(Number(invoice.taxAmount)).toBeCloseTo(expectedTax, 2);
        expect(Number(invoice.totalAmount)).toBeCloseTo(expectedTotal, 2);
    });

    test('Tax Exempt Invoice Creation', async () => {
        const customer = await prisma.customer.findFirst({ where: { taxExempt: true } });
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing tax-exempt customer for test');
            test.skip();
            return;
        }

        const res = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 1,
                unitPrice: Number(product.basePrice),
                discount: 0
            }]
        });

        expect(res.ok()).toBeTruthy();
        const invoice = await res.json();

        expect(Number(invoice.taxAmount)).toBe(0);
    });

    test('Quote to Invoice Conversion', async () => {
        // Create a quote first
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for quote conversion');
            test.skip();
            return;
        }

        const quoteRes = await helper.post('/api/quotes', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                quantity: 3,
                unitPrice: Number(product.basePrice),
                discount: 0
            }],
            notes: 'Test quote for conversion',
            validityDays: 30
        });

        expect(quoteRes.ok()).toBeTruthy();
        const quote = await quoteRes.json();

        // Convert to invoice
        const invoiceRes = await helper.post('/api/invoices/convert-from-quote', {
            quoteId: quote.id
        });

        if (!invoiceRes.ok()) {
            console.log(`Quote to invoice conversion failed: ${invoiceRes.status()}`);
            console.log(await invoiceRes.text());
        }

        expect(invoiceRes.ok()).toBeTruthy();
        const invoice = await invoiceRes.json();

        expect(invoice.quoteId).toBe(quote.id);
        expect(Number(invoice.totalAmount)).toBe(Number(quote.totalAmount));
        expect(invoice.InvoiceItem.length).toBe(quote.QuoteItem.length);
        expect(invoice.status).toBe('DRAFT');
    });

    test('Order to Invoice Conversion', async () => {
        // Create a completed order first
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for order conversion');
            test.skip();
            return;
        }

        const order = await prisma.order.create({
            data: {
                id: `ord-test-${Date.now()}`,
                orderNumber: `ORD-TEST-${Date.now()}`,
                customerId: customer.id,
                locationId: location.id,
                status: 'COMPLETED',
                totalAmount: 150,
                subtotal: 150,
                updatedAt: new Date(),
                createdAt: new Date(),
                OrderItem: {
                    create: {
                        id: `oi-${Date.now()}`,
                        productId: product.id,
                        quantity: 5,
                        price: 30
                    }
                }
            }
        });

        const invoiceRes = await helper.post(`/api/orders/${order.id}/invoice`, {});

        if (!invoiceRes.ok()) {
            console.log(`Order to invoice conversion failed: ${invoiceRes.status()}`);
            console.log(await invoiceRes.text());
        }

        expect(invoiceRes.ok()).toBeTruthy();
        const body = await invoiceRes.json();
        const invoice = body.invoice;

        expect(invoice.orderId).toBe(order.id);
        expect(invoice.InvoiceItem.length).toBeGreaterThan(0);
        expect(invoice.status).toBe('SENT'); // New endpoint sets status to SENT
    });

    test('Payment Recording - Full Payment', async () => {
        // Create an invoice first
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for payment recording');
            test.skip();
            return;
        }

        const invoiceRes = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 2,
                unitPrice: 50,
                discount: 0
            }]
        });

        const invoice = await invoiceRes.json();
        const totalAmount = Number(invoice.totalAmount);

        // Process payment through emulator
        const paymentResult = await PaymentTestHelper.createCheckPayment(totalAmount, 'CHK-12345');
        expect(paymentResult.success).toBeTruthy();

        // Record full payment with emulator transaction ID
        const paymentRes = await helper.post('/api/invoice-payments', {
            invoiceId: invoice.id,
            customerId: customer.id,
            amount: totalAmount,
            paymentMethod: 'CHECK',
            referenceNumber: paymentResult.transactionId,
            notes: `Test payment - ${paymentResult.message}`
        });

        if (!paymentRes.ok()) {
            console.log(`Payment recording failed: ${paymentRes.status()}`);
            console.log(await paymentRes.json());
        }

        expect(paymentRes.ok()).toBeTruthy();
        const payment = await paymentRes.json();

        expect(Number(payment.amount)).toBe(totalAmount);
        expect(Number(payment.appliedAmount)).toBe(totalAmount);
        expect(Number(payment.unappliedAmount)).toBe(0);

        // Verify invoice status updated
        const updatedInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id }
        });

        expect(updatedInvoice?.status).toBe('PAID');
        expect(Number(updatedInvoice?.balanceDue)).toBe(0);
        expect(updatedInvoice?.paidAt).toBeDefined();
    });

    test('Payment Recording - Partial Payment', async () => {
        // Create an invoice first
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for partial payment');
            test.skip();
            return;
        }

        const invoiceRes = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 4,
                unitPrice: 25,
                discount: 0
            }]
        });

        const invoice = await invoiceRes.json();
        const totalAmount = Number(invoice.totalAmount);
        const partialAmount = Number((totalAmount / 2).toFixed(2));

        // Process payment through emulator
        const paymentResult = await PaymentTestHelper.createSuccessfulPayment(partialAmount, 'CREDIT_CARD');
        expect(paymentResult.success).toBeTruthy();

        // Record partial payment with emulator transaction ID
        const paymentRes = await helper.post('/api/invoice-payments', {
            invoiceId: invoice.id,
            customerId: customer.id,
            amount: partialAmount,
            paymentMethod: 'CREDIT_CARD',
            referenceNumber: paymentResult.transactionId,
            notes: 'Partial payment test'
        });

        if (!paymentRes.ok()) {
            console.log(`Partial payment failed: ${paymentRes.status()}`);
            console.log(await paymentRes.json());
        }

        expect(paymentRes.ok()).toBeTruthy();
        const payment = await paymentRes.json();

        expect(Number(payment.appliedAmount)).toBeCloseTo(partialAmount, 2);

        // Verify invoice status
        const updatedInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id }
        });

        expect(updatedInvoice?.status).toBe('PARTIALLY_PAID');
        expect(Number(updatedInvoice?.balanceDue)).toBeCloseTo(totalAmount - partialAmount, 2);
    });

    test('Credit Hold Validation', async () => {
        // Create a dedicated customer with credit hold
        const customer = await prisma.customer.create({
            data: {
                id: `cust-hold-${Date.now()}`,
                name: 'Credit Hold Test Customer',
                email: `hold-${Date.now()}@test.com`,
                creditHold: true,
                updatedAt: new Date()
            }
        });

        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!location || !product) {
            console.log('Missing test data for credit hold test');
            test.skip();
            return;
        }

        const res = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 1,
                unitPrice: Number(product.basePrice),
                discount: 0
            }]
        });

        expect(res.status()).toBe(400);
        const error = await res.json();
        expect(error.error).toContain('credit hold');

        // Clean up
        await prisma.customer.delete({ where: { id: customer.id } });
    });

    test('Invoice List Retrieval', async () => {
        const res = await helper.get('/api/invoices');
        expect(res.ok()).toBeTruthy();

        const invoices = await res.json();
        expect(Array.isArray(invoices)).toBeTruthy();

        if (invoices.length > 0) {
            const invoice = invoices[0];
            expect(invoice).toHaveProperty('invoiceNumber');
            expect(invoice).toHaveProperty('Customer');
            expect(invoice).toHaveProperty('Location');
            expect(invoice).toHaveProperty('status');
        }
    });

    test('Invoice Detail Retrieval', async () => {
        const invoice = await prisma.invoice.findFirst({
            include: { InvoiceItem: true }
        });

        if (!invoice) {
            console.log('No invoices found for detail test');
            test.skip();
            return;
        }

        const res = await helper.get(`/api/invoices/${invoice.id}`);
        expect(res.ok()).toBeTruthy();

        const details = await res.json();
        expect(details.id).toBe(invoice.id);
        expect(details).toHaveProperty('InvoiceItem');
        expect(details).toHaveProperty('InvoicePayment');
        expect(details).toHaveProperty('Customer');
        expect(details).toHaveProperty('Location');
    });

    test('Draft Invoice Update', async () => {
        // Create a draft invoice
        const customer = await prisma.customer.findFirst();
        const location = await prisma.location.findFirst();
        const product = await prisma.product.findFirst({ where: { isActive: true } });

        if (!customer || !location || !product) {
            console.log('Missing test data for invoice update');
            test.skip();
            return;
        }

        const invoiceRes = await helper.post('/api/invoices', {
            customerId: customer.id,
            locationId: location.id,
            items: [{
                productId: product.id,
                description: product.name,
                quantity: 1,
                unitPrice: Number(product.basePrice),
                discount: 0
            }],
            notes: 'Original notes'
        });

        const invoice = await invoiceRes.json();

        // Update the invoice
        const updateRes = await helper.patch(`/api/invoices/${invoice.id}`, {
            notes: 'Updated notes',
            terms: 'Updated payment terms'
        });

        expect(updateRes.ok()).toBeTruthy();
        const updated = await updateRes.json();

        expect(updated.notes).toBe('Updated notes');
        expect(updated.terms).toBe('Updated payment terms');
    });

    test('Payment Method Validation', async () => {
        const customer = await prisma.customer.findFirst();

        if (!customer) {
            console.log('Missing test data for payment method test');
            test.skip();
            return;
        }

        // Test various payment methods using emulator
        const paymentMethods: Array<'CASH' | 'CHECK' | 'CREDIT_CARD' | 'ACH' | 'WIRE_TRANSFER'> =
            ['CASH', 'CHECK', 'CREDIT_CARD', 'ACH', 'WIRE_TRANSFER'];

        for (const method of paymentMethods) {
            // Process through emulator first
            const paymentResult = await PaymentTestHelper.createSuccessfulPayment(10, method);
            expect(paymentResult.success).toBeTruthy();

            // Record in system
            const paymentRes = await helper.post('/api/invoice-payments', {
                customerId: customer.id,
                amount: 10,
                paymentMethod: method,
                referenceNumber: paymentResult.transactionId,
                notes: `Test ${method} payment - ${paymentResult.message}`
            });

            if (!paymentRes.ok()) {
                console.log(`Payment with ${method} failed: ${paymentRes.status()}`);
                const errorText = await paymentRes.text();
                console.log('Error:', errorText.substring(0, 200));
            }

            expect(paymentRes.ok()).toBeTruthy();
        }
    });
});
