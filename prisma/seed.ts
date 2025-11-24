import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌲 Seeding Pine Lumber Yard...');

    // Clear existing data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.agent.deleteMany();

    // Create Products
    const products = await Promise.all([
        // Lumber
        prisma.product.create({
            data: {
                name: '2x4x8 Pressure Treated Pine',
                description: 'Standard framing lumber, pressure treated for outdoor use',
                sku: 'PT-2X4-8',
                price: 8.97,
                stockLevel: 450,
                category: 'Lumber',
            },
        }),
        prisma.product.create({
            data: {
                name: '2x6x10 Douglas Fir',
                description: 'Premium grade Douglas Fir for structural applications',
                sku: 'DF-2X6-10',
                price: 18.45,
                stockLevel: 220,
                category: 'Lumber',
            },
        }),
        prisma.product.create({
            data: {
                name: '4x4x8 Cedar Post',
                description: 'Naturally rot-resistant cedar fence post',
                sku: 'CD-4X4-8',
                price: 24.99,
                stockLevel: 8, // Low stock!
                category: 'Lumber',
            },
        }),
        prisma.product.create({
            data: {
                name: '1x6x8 Pine Board',
                description: 'Smooth finish pine board for trim and shelving',
                sku: 'PN-1X6-8',
                price: 12.50,
                stockLevel: 180,
                category: 'Lumber',
            },
        }),
        // Plywood & Panels
        prisma.product.create({
            data: {
                name: '4x8 1/2" CDX Plywood',
                description: 'Construction grade plywood for sheathing',
                sku: 'PLY-CDX-48',
                price: 42.99,
                stockLevel: 95,
                category: 'Plywood',
            },
        }),
        prisma.product.create({
            data: {
                name: '4x8 3/4" Oak Plywood',
                description: 'Hardwood veneer plywood for cabinetry',
                sku: 'PLY-OAK-48',
                price: 89.99,
                stockLevel: 6, // Low stock!
                category: 'Plywood',
            },
        }),
        // Hardware
        prisma.product.create({
            data: {
                name: 'Deck Screws 3" (5lb box)',
                description: 'Exterior grade coated deck screws',
                sku: 'HW-SCREW-3',
                price: 19.99,
                stockLevel: 145,
                category: 'Hardware',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Framing Nails 16d (50lb box)',
                description: 'Hot-dipped galvanized framing nails',
                sku: 'HW-NAIL-16D',
                price: 89.99,
                stockLevel: 32,
                category: 'Hardware',
            },
        }),
        // Concrete & Masonry
        prisma.product.create({
            data: {
                name: '80lb Concrete Mix',
                description: 'Fast-setting concrete for posts and footings',
                sku: 'CON-MIX-80',
                price: 6.99,
                stockLevel: 280,
                category: 'Concrete',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Rebar 1/2" x 10ft',
                description: 'Grade 60 steel reinforcement bar',
                sku: 'REB-12-10',
                price: 8.50,
                stockLevel: 5, // Low stock!
                category: 'Concrete',
            },
        }),
    ]);

    console.log(`✅ Created ${products.length} products`);

    // Create Customers
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'ABC Construction LLC',
                email: 'orders@abcconstruction.com',
                phone: '555-0101',
                address: '123 Builder Ave, Construction City, ST 12345',
            },
        }),
        prisma.customer.create({
            data: {
                name: 'HomeOwner Joe',
                email: 'joe.homeowner@email.com',
                phone: '555-0202',
                address: '456 Residential St, Suburbia, ST 67890',
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Premier Decks & Fencing',
                email: 'info@premierdecks.com',
                phone: '555-0303',
                address: '789 Contractor Blvd, Tradesville, ST 11223',
            },
        }),
        prisma.customer.create({
            data: {
                name: 'City School District',
                email: 'facilities@cityschools.edu',
                phone: '555-0404',
                address: '321 Education Way, Schooltown, ST 44556',
            },
        }),
    ]);

    console.log(`✅ Created ${customers.length} customers`);

    // Create Orders
    const order1 = await prisma.order.create({
        data: {
            customerId: customers[0].id,
            status: 'COMPLETED',
            totalAmount: 1247.83,
            items: {
                create: [
                    {
                        productId: products[0].id,
                        quantity: 50,
                        price: 8.97,
                    },
                    {
                        productId: products[4].id,
                        quantity: 15,
                        price: 42.99,
                    },
                    {
                        productId: products[6].id,
                        quantity: 3,
                        price: 19.99,
                    },
                ],
            },
        },
    });

    const order2 = await prisma.order.create({
        data: {
            customerId: customers[1].id,
            status: 'PENDING',
            totalAmount: 324.45,
            items: {
                create: [
                    {
                        productId: products[2].id,
                        quantity: 12,
                        price: 24.99,
                    },
                    {
                        productId: products[8].id,
                        quantity: 4,
                        price: 6.99,
                    },
                ],
            },
        },
    });

    const order3 = await prisma.order.create({
        data: {
            customerId: customers[2].id,
            status: 'COMPLETED',
            totalAmount: 2156.78,
            items: {
                create: [
                    {
                        productId: products[0].id,
                        quantity: 100,
                        price: 8.97,
                    },
                    {
                        productId: products[1].id,
                        quantity: 60,
                        price: 18.45,
                    },
                    {
                        productId: products[6].id,
                        quantity: 10,
                        price: 19.99,
                    },
                ],
            },
        },
    });

    console.log(`✅ Created 3 orders`);

    // Create Agent
    await prisma.agent.create({
        data: {
            name: 'StockWatcher',
            type: 'INVENTORY_WATCHER',
            status: 'ACTIVE',
            lastRun: new Date(),
            config: {
                threshold: 10,
                checkInterval: 3600,
            },
        },
    });

    console.log('✅ Created AI agent');
    console.log('🎉 Seed complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
