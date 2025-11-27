import prisma from '../src/lib/prisma';

async function testConversion() {
    console.log('Starting conversion test...');

    try {
        // Find an existing quote
        const quote = await prisma.quote.findFirst({
            where: {
                status: { in: ['PENDING', 'SENT'] },
                convertedToOrderId: null,
            },
            include: {
                QuoteItem: true,
                Customer: true,
            },
        });

        if (!quote) {
            console.log('No suitable quote found. Creating one...');

            // Get required data
            const customer = await prisma.customer.findFirst();
            const location = await prisma.location.findFirst();
            const product = await prisma.product.findFirst();
            const user = await prisma.user.findFirst();

            if (!customer || !location || !product || !user) {
                console.error('Missing required data (customer, location, product, or user)');
                return;
            }

            // Create a test quote
            const newQuote = await prisma.quote.create({
                data: {
                    quoteNumber: `Q-TEST-${Date.now()}`,
                    customerId: customer.id,
                    locationId: location.id,
                    createdById: user.id,
                    status: 'PENDING',
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    subtotal: 100.00,
                    taxAmount: 0.00,
                    totalAmount: 100.00,
                    QuoteItem: {
                        create: {
                            productId: product.id,
                            quantity: 1,
                            unitPrice: 100.00,
                            discount: 0.00,
                            subtotal: 100.00,
                        },
                    },
                },
                include: {
                    QuoteItem: true,
                    Customer: true,
                },
            });

            console.log(`Created test quote: ${newQuote.quoteNumber}`);
            return testConversion(); // Retry with the new quote
        }

        console.log(`Found quote: ${quote.quoteNumber} with ${quote.QuoteItem.length} items`);

        // Generate order number
        const orderCount = await prisma.order.count();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;
        console.log(`Generated order number: ${orderNumber}`);

        // Try to create the order
        console.log('Creating order...');
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId: quote.customerId,
                locationId: quote.locationId,
                salesRepId: quote.createdById,
                subtotal: quote.subtotal,
                taxAmount: quote.taxAmount,
                discountAmount: quote.discountAmount,
                deliveryFee: quote.deliveryFee,
                totalAmount: quote.totalAmount,
                status: 'PENDING',
                paymentStatus: 'PENDING',
                orderType: 'QUOTE_CONVERSION',
                fulfillmentType: 'PICKUP',
                OrderItem: {
                    create: quote.QuoteItem.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: Number(item.unitPrice),
                        discount: Number(item.discount),
                    })),
                },
            },
        });

        console.log(`✅ Order created successfully: ${order.orderNumber} (${order.id})`);

        // Update the quote
        await prisma.quote.update({
            where: { id: quote.id },
            data: {
                convertedToOrderId: order.id,
                status: 'ACCEPTED',
                acceptedAt: new Date(),
            },
        });

        console.log(`✅ Quote updated successfully`);
        console.log('\n=== TEST PASSED ===');

    } catch (error) {
        console.error('\n=== TEST FAILED ===');
        console.error('Error:', error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testConversion();
