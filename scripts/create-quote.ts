
import { PrismaClient } from '@prisma/client';

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
            quoteNumber: `Q${Date.now()}`,
            customerId: customer.id,
            locationId: location.id,
            createdById: user.id,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            totalAmount: 100.00,
            subtotal: 100.00,
            taxAmount: 0.00,
            status: 'DRAFT',
            QuoteItem: {
                create: {
                    productId: product.id,
                    quantity: 1,
                    unitPrice: 100.00,
                    subtotal: 100.00,
                }
            }
        }
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
