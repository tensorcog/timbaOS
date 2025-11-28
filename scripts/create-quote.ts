
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating quote...');

    // Find a user, customer, location, and product
    const user = await prisma.user.findFirst();
    const customer = await prisma.customer.findFirst();
    const location = await prisma.location.findFirst();
    const product = await prisma.product.findFirst();

    if (!user || !customer || !location || !product) {
        console.error('Missing required data (user, customer, location, or product)');
        return;
    }

    const quote = await prisma.quote.create({
        data: {
            id: randomUUID(),
            quoteNumber: `Q-${Date.now()}`,
            locationId: location.id,
            customerId: customer.id,
            createdById: user.id,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: 'DRAFT',
            QuoteItem: {
                create: {
                    id: randomUUID(),
                    productId: product.id,
                    quantity: 1,
                    unitPrice: 100.00,
                    subtotal: 100.00,
                },
            },
            subtotal: 100.00,
            taxAmount: 0.00,
            deliveryFee: 0.00,
            discountAmount: 0.00,
            totalAmount: 100.00,
            updatedAt: new Date(),
        },
        include: {
            QuoteItem: true,
        },
    });

    console.log(`Quote created: ${quote.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
