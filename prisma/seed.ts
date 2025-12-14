import {
    PrismaClient,
    UserRole,
    CustomerType,
    OrderStatus,
    PaymentStatus,
    FulfillmentType,
    TransferStatus,
    OrderType,
    QuoteStatus,
    ShipmentStatus
} from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to get random item from array
function randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

// Helper to get random int
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
    console.log('🏪 Seeding Bills Supplies - Upstate NY...');

    // Clear existing data (in correct order to avoid FK constraints)
    await prisma.auditLog.deleteMany();
    await prisma.productRecommendation.deleteMany();
    
    // Quotes and items
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    
    // Transfers and items
    await prisma.transferItem.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    
    // Invoices and related
    await prisma.invoicePayment.deleteMany();
    await prisma.creditNote.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    
    // Appointments
    await prisma.appointment.deleteMany();
    
    // Payments
    await prisma.payment.deleteMany();
    
    // Shipments and items
    await prisma.shipmentItem.deleteMany();
    await prisma.shipment.deleteMany();
    
    // Orders and items
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    
    // Inventory and pricing
    await prisma.locationInventory.deleteMany();
    await prisma.locationPricing.deleteMany();
    
    // Users and locations
    await prisma.userLocation.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Cleared existing data');

    const hashedPassword = await bcrypt.hash('password', 10);

    // Create Users
    const users = await Promise.all([
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'admin@billssupplies.com',
                name: 'Bill Thompson',
                password: hashedPassword,
                role: UserRole.SUPER_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'amherst.manager@billssupplies.com',
                name: 'Sarah Martinez',
                password: hashedPassword,
                role: UserRole.LOCATION_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'buffalo.manager@billssupplies.com',
                name: 'Mike O\'Connor',
                password: hashedPassword,
                role: UserRole.LOCATION_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'westchester.manager@billssupplies.com',
                name: 'Jennifer Wu',
                password: hashedPassword,
                role: UserRole.LOCATION_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'orchardpark.manager@billssupplies.com',
                name: 'Tom Kowalski',
                password: hashedPassword,
                role: UserRole.LOCATION_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'niagara.manager@billssupplies.com',
                name: 'Lisa Chen',
                password: hashedPassword,
                role: UserRole.LOCATION_ADMIN,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'sales1@billssupplies.com',
                name: 'Robert Johnson',
                password: hashedPassword,
                role: UserRole.SALES,
                updatedAt: new Date(),
            },
        }),
        prisma.user.create({
            data: {
                id: randomUUID(),
                email: 'sales2@billssupplies.com',
                name: 'Amanda Rodriguez',
                password: hashedPassword,
                role: UserRole.SALES,
                updatedAt: new Date(),
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create 5 Locations in Upstate NY
    const locations = await Promise.all([
        prisma.location.create({
            data: {
                id: randomUUID(),
                code: 'AMHERST',
                name: 'Bills Supplies - Amherst',
                address: '4250 Maple Road, Amherst, NY 14226',
                phone: '716-555-0100',
                email: 'amherst@billssupplies.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[1].id,
                updatedAt: new Date(),
            },
        }),
        prisma.location.create({
            data: {
                id: randomUUID(),
                code: 'BUFFALO',
                name: 'Bills Supplies - Buffalo',
                address: '1875 Main Street, Buffalo, NY 14208',
                phone: '716-555-0200',
                email: 'buffalo@billssupplies.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[2].id,
                updatedAt: new Date(),
            },
        }),
        prisma.location.create({
            data: {
                id: randomUUID(),
                code: 'WESTCHESTER',
                name: 'Bills Supplies - Westchester',
                address: '328 Central Avenue, White Plains, NY 10606',
                phone: '914-555-0300',
                email: 'westchester@billssupplies.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[3].id,
                updatedAt: new Date(),
            },
        }),
        prisma.location.create({
            data: {
                id: randomUUID(),
                code: 'ORCHARDPARK',
                name: 'Bills Supplies - Orchard Park',
                address: '5680 Abbott Road, Orchard Park, NY 14127',
                phone: '716-555-0400',
                email: 'orchardpark@billssupplies.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[4].id,
                updatedAt: new Date(),
            },
        }),
        prisma.location.create({
            data: {
                id: randomUUID(),
                code: 'NIAGARA',
                name: 'Bills Supplies - Niagara Falls',
                address: '2450 Military Road, Niagara Falls, NY 14304',
                phone: '716-555-0500',
                email: 'niagara@billssupplies.com',
                isActive: true,
                isWarehouse: true,
                managerId: users[5].id,
                updatedAt: new Date(),
            },
        }),
    ]);

    console.log(`✅ Created ${locations.length} locations`);

    // Assign users to locations
    await Promise.all([
        // Managers
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[1].id, locationId: locations[0].id, canManage: true } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[2].id, locationId: locations[1].id, canManage: true } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[3].id, locationId: locations[2].id, canManage: true } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[4].id, locationId: locations[3].id, canManage: true } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[5].id, locationId: locations[4].id, canManage: true } }),

        // Sales Reps
        // Sales1 to all locations for testing ease
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[6].id, locationId: locations[0].id, canManage: false } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[6].id, locationId: locations[1].id, canManage: false } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[6].id, locationId: locations[2].id, canManage: false } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[6].id, locationId: locations[3].id, canManage: false } }),
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[6].id, locationId: locations[4].id, canManage: false } }),

        // Sales2 to Westchester
        prisma.userLocation.create({ data: { id: randomUUID(), userId: users[7].id, locationId: locations[2].id, canManage: false } }),
    ]);
    console.log('✅ Assigned users to locations');

    // Create 200 Products across various categories
    const productCategories = [
        'Lumber', 'Plywood', 'Hardware', 'Tools', 'Paint', 'Electrical',
        'Plumbing', 'Concrete', 'Insulation', 'Roofing', 'Doors', 'Windows'
    ];

    const products = [];
    let skuCounter = 1000;

    // Lumber products (30)
    const lumberTypes = ['Pine', 'Oak', 'Cedar', 'Pressure Treated', 'Douglas Fir', 'Spruce'];
    const lumberSizes = ['2x4x8', '2x4x10', '2x6x8', '2x6x10', '2x8x10', '4x4x8', '1x6x8', '2x10x12'];
    for (let i = 0; i < 30; i++) {
        const type = randomItem(lumberTypes);
        const size = randomItem(lumberSizes);
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `${size} ${type}`,
                description: `${type} lumber for framing and construction`,
                sku: `LMB-${skuCounter++}`,
                basePrice: randomInt(5, 35) + 0.99,
                category: 'Lumber',
                uom: 'EA',
                updatedAt: new Date(),
            },
        }));
    }

    // Plywood & Sheet Goods (25)
    const plywoodTypes = ['CDX', 'OSB', 'Oak', 'Birch', 'MDF', 'Particle Board'];
    const thicknesses = ['1/4"', '1/2"', '3/4"', '5/8"'];
    for (let i = 0; i < 25; i++) {
        const type = randomItem(plywoodTypes);
        const thickness = randomItem(thicknesses);
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `4x8 ${thickness} ${type}`,
                description: `${thickness} ${type} sheet goods`,
                sku: `PLY-${skuCounter++}`,
                basePrice: randomInt(25, 95) + 0.99,
                category: 'Plywood',
                uom: 'SHEET',
                updatedAt: new Date(),
            },
        }));
    }

    // Hardware (35)
    const hardwareItems = [
        'Deck Screws', 'Drywall Screws', 'Framing Nails', 'Finish Nails', 'Roofing Nails',
        'Bolts', 'Lag Screws', 'Wood Screws', 'Brad Nails', 'Staples'
    ];
    for (let i = 0; i < 35; i++) {
        const item = randomItem(hardwareItems);
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `${item} ${randomItem(['1"', '2"', '3"', '16d', '8d'])} (${randomItem(['1lb', '5lb', '25lb', '50lb'])})`,
                description: `Quality ${item.toLowerCase()} for construction`,
                sku: `HW-${skuCounter++}`,
                basePrice: randomInt(8, 95) + 0.99,
                category: 'Hardware',
                uom: 'BOX',
                updatedAt: new Date(),
            },
        }));
    }

    // Tools (30)
    const tools = [
        'Hammer', 'Circular Saw', 'Drill', 'Impact Driver', 'Level', 'Square',
        'Tape Measure', 'Utility Knife', 'Chisel Set', 'Wrench Set', 'Pliers'
    ];
    for (let i = 0; i < 30; i++) {
        const tool = randomItem(tools);
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `${randomItem(['Pro', 'Professional', 'Heavy Duty', 'Standard'])} ${tool}`,
                description: `Reliable ${tool.toLowerCase()} for professionals`,
                sku: `TOOL-${skuCounter++}`,
                basePrice: randomInt(15, 299) + 0.99,
                category: 'Tools',
                uom: 'EA',
                updatedAt: new Date(),
            },
        }));
    }

    // Paint (20)
    const paintTypes = ['Interior', 'Exterior', 'Primer', 'Stain', 'Varnish'];
    const finishes = ['Flat', 'Eggshell', 'Satin', 'Semi-Gloss', 'Gloss'];
    for (let i = 0; i < 20; i++) {
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `${randomItem(paintTypes)} Paint - ${randomItem(finishes)} (Gallon)`,
                description: 'Premium quality paint',
                sku: `PNT-${skuCounter++}`,
                basePrice: randomInt(25, 75) + 0.99,
                category: 'Paint',
                uom: 'GAL',
                updatedAt: new Date(),
            },
        }));
    }

    // Electrical (20)
    const electricalItems = [
        'Romex Wire 14/2', 'Romex Wire 12/2', 'Junction Box', 'Outlet', 'Switch',
        'Breaker 15A', 'Breaker 20A', 'Conduit', 'Wire Nuts', 'Electrical Tape'
    ];
    for (let i = 0; i < 20; i++) {
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: randomItem(electricalItems),
                description: 'Electrical supplies',
                sku: `ELEC-${skuCounter++}`,
                basePrice: randomInt(2, 85) + 0.99,
                category: 'Electrical',
                uom: randomItem(['EA', 'BOX', 'FT']),
                updatedAt: new Date(),
            },
        }));
    }

    // Plumbing (20)
    const plumbingItems = [
        'PVC Pipe 1/2"', 'PVC Pipe 3/4"', 'Copper Pipe', 'PEX Tubing', 'Shut-off Valve',
        'Faucet', 'Toilet', 'Drain Trap', 'PVC Cement', 'Teflon Tape'
    ];
    for (let i = 0; i < 20; i++) {
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: randomItem(plumbingItems),
                description: 'Plumbing supplies',
                sku: `PLUMB-${skuCounter++}`,
                basePrice: randomInt(3, 299) + 0.99,
                category: 'Plumbing',
                uom: randomItem(['EA', 'FT']),
                updatedAt: new Date(),
            },
        }));
    }

    // Concrete & Masonry (10)
    for (let i = 0; i < 10; i++) {
        const item = randomItem(['Concrete Mix', 'Mortar Mix', 'Grout', 'Rebar', 'Concrete Block']);
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `${item} ${randomItem(['60lb', '80lb', '1/2"x10ft', '8x8x16'])}`,
                description: 'Concrete and masonry products',
                sku: `CONC-${skuCounter++}`,
                basePrice: randomInt(4, 45) + 0.99,
                category: 'Concrete',
                uom: randomItem(['BAG', 'EA']),
                updatedAt: new Date(),
            },
        }));
    }

    // Insulation (10)
    for (let i = 0; i < 10; i++) {
        products.push(await prisma.product.create({
            data: {
                id: randomUUID(),
                name: `Insulation R-${randomItem([13, 15, 19, 21, 30])} ${randomItem(['Batts', 'Rolls', 'Foam Board'])}`,
                description: 'Insulation products',
                sku: `INSUL-${skuCounter++}`,
                basePrice: randomInt(15, 89) + 0.99,
                category: 'Insulation',
                uom: 'EA',
                updatedAt: new Date(),
            },
        }));
    }

    console.log(`✅ Created ${products.length} products`);

    // Create inventory for each location
    for (const location of locations) {
        const isWarehouse = location.isWarehouse;
        const inventoryData = products.map(product => ({
            id: randomUUID(),
            locationId: location.id,
            productId: product.id,
            stockLevel: isWarehouse ? randomInt(500, 5000) : randomInt(10, 300),
            reorderPoint: isWarehouse ? randomInt(200, 1000) : randomInt(5, 50),
            aisle: `${randomItem(['A', 'B', 'C', 'D', 'E'])}${randomInt(1, 20)}`,
            updatedAt: new Date(),
        }));

        await prisma.locationInventory.createMany({ data: inventoryData });
    }

    console.log(`✅ Created inventory for all locations`);

    // Create 250 Customers
    const customerFirstNames = ['John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const customerLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    const companyTypes = ['Construction', 'Contracting', 'Remodeling', 'Roofing', 'Plumbing', 'Electrical', 'Carpentry', 'Landscaping'];
    const streets = ['Main St', 'Oak Ave', 'Maple Rd', 'Pine St', 'Elm Dr', 'Cedar Ln', 'Broadway', 'Park Ave', 'Washington St', 'Lake Rd'];
    const nyCities = ['Buffalo', 'Amherst', 'Cheektowaga', 'West Seneca', 'Tonawanda', 'Niagara Falls', 'Lockport', 'Hamburg', 'Lancaster', 'Orchard Park'];

    const customers = [];
    for (let i = 0; i < 250; i++) {
        const isCompany = i < 100; // First 100 are contractors/wholesale
        const customerType = isCompany
            ? randomItem([CustomerType.CONTRACTOR, CustomerType.WHOLESALE])
            : CustomerType.RETAIL;

        let name, email;
        if (isCompany) {
            const companyName = `${randomItem(customerLastNames)} ${randomItem(companyTypes)}`;
            name = companyName;
            email = `${companyName.toLowerCase().replace(/\s+/g, '')}@example.com`;
        } else {
            const firstName = randomItem(customerFirstNames);
            const lastName = randomItem(customerLastNames);
            name = `${firstName} ${lastName}`;
            email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
        }

        customers.push(await prisma.customer.create({
            data: {
                id: randomUUID(),
                name,
                email: `customer${i}_${email}`,
                phone: `716-555-${String(i).padStart(4, '0')}`,
                address: `${randomInt(100, 9999)} ${randomItem(streets)}, ${randomItem(nyCities)}, NY ${14200 + randomInt(0, 99)}`,
                customerType,
                accountNumber: isCompany ? `ACC-${String(i + 1).padStart(4, '0')}` : null,
                creditLimit: isCompany ? randomInt(10000, 100000) : 0,
                taxExempt: customerType === CustomerType.WHOLESALE && Math.random() > 0.7,
                taxId: (customerType === CustomerType.WHOLESALE && Math.random() > 0.7) ? `TAX-${String(i).padStart(6, '0')}` : null,
                loyaltyPoints: customerType === CustomerType.RETAIL ? randomInt(0, 5000) : 0,
                updatedAt: new Date(),
            },
        }));
    }

    console.log(`✅ Created ${customers.length} customers`);

    // Create 3,000 Orders
    const statuses = [OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.PENDING, OrderStatus.PROCESSING];
    const paymentStatuses = [PaymentStatus.PAID, PaymentStatus.PAID, PaymentStatus.PAID, PaymentStatus.PENDING];
    const fulfillmentTypes = [FulfillmentType.PICKUP, FulfillmentType.PICKUP, FulfillmentType.DELIVERY];
    const orderTypes = [OrderType.STANDARD, OrderType.STANDARD, OrderType.STANDARD, OrderType.POS];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    console.log('Creating 3,000 orders (this may take a minute)...');

    for (let i = 0; i < 3000; i++) {
        const location = randomItem(locations.filter(l => !l.isWarehouse));
        const customer = randomItem(customers);
        const salesRep = randomItem([users[6], users[7]]);
        const status = randomItem(statuses);
        const orderType = randomItem(orderTypes);
        const fulfillmentType = randomItem(fulfillmentTypes);

        // Create 1-8 order items
        const itemCount = randomInt(1, 8);
        const orderItems = [];
        let subtotal = 0;

        for (let j = 0; j < itemCount; j++) {
            const product = randomItem(products);
            const quantity = randomInt(1, 25);
            const price = Number(product.basePrice) * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variation

            orderItems.push({
                id: randomUUID(),
                productId: product.id,
                quantity,
                price: Math.round(price * 100) / 100,
            });

            subtotal += quantity * price;
        }

        const taxRate = customer.taxExempt ? 0 : 0.0825; // 8.25% sales tax
        const taxAmount = subtotal * taxRate;
        const deliveryFee = fulfillmentType === FulfillmentType.DELIVERY ? randomInt(0, 150) : 0;
        const discountAmount = customer.customerType === CustomerType.CONTRACTOR ? subtotal * 0.05 : 0; // 5% contractor discount
        const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

        await prisma.order.create({
            data: {
                id: randomUUID(),
                orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
                locationId: location.id,
                customerId: customer.id,
                salesRepId: salesRep.id,
                status,
                orderType,
                paymentStatus: randomItem(paymentStatuses),
                fulfillmentType,
                subtotal: Math.round(subtotal * 100) / 100,
                taxAmount: Math.round(taxAmount * 100) / 100,
                deliveryFee: Math.round(deliveryFee * 100) / 100,
                discountAmount: Math.round(discountAmount * 100) / 100,
                totalAmount: Math.round(totalAmount * 100) / 100,
                deliveryAddress: fulfillmentType === FulfillmentType.DELIVERY ? customer.address : null,
                deliveryDate: fulfillmentType === FulfillmentType.DELIVERY ? randomDate(startDate, endDate) : null,
                createdAt: randomDate(startDate, endDate),
                updatedAt: new Date(),
                OrderItem: {
                    create: orderItems,
                },
            },
        });

        if ((i + 1) % 500 === 0) {
            console.log(`  Created ${i + 1} orders...`);
        }
    }

    console.log(`✅ Created 3,000 orders`);

    // Create some inventory transfers
    for (let i = 0; i < 20; i++) {
        const originLocation = locations[4]; // Warehouse
        const destLocation = randomItem(locations.filter(l => !l.isWarehouse));
        const requestor = users.find(u => u.id === destLocation.managerId);
        const status = randomItem([TransferStatus.PENDING, TransferStatus.APPROVED, TransferStatus.IN_TRANSIT, TransferStatus.RECEIVED]);

        const transferItems = [];
        for (let j = 0; j < randomInt(2, 6); j++) {
            const product = randomItem(products);
            const qty = randomInt(10, 100);
            transferItems.push({
                id: randomUUID(),
                productId: product.id,
                requestedQty: qty,
                shippedQty: status !== TransferStatus.PENDING ? qty : null,
                receivedQty: status === TransferStatus.RECEIVED ? qty : null,
            });
        }

        await prisma.inventoryTransfer.create({
            data: {
                id: randomUUID(),
                transferNumber: `TRF-${String(i + 1).padStart(5, '0')}`,
                originLocationId: originLocation.id,
                destinationLocationId: destLocation.id,
                status,
                requestedById: requestor!.id,
                approvedById: status !== TransferStatus.PENDING ? users[0].id : null,
                requestedAt: randomDate(startDate, endDate),
                approvedAt: status !== TransferStatus.PENDING ? randomDate(startDate, endDate) : null,
                shippedAt: status === TransferStatus.IN_TRANSIT || status === TransferStatus.RECEIVED ? randomDate(startDate, endDate) : null,
                receivedAt: status === TransferStatus.RECEIVED ? randomDate(startDate, endDate) : null,
                notes: randomItem(['Regular restock', 'Low inventory alert', 'Seasonal restock', 'Customer special order', null]),
                updatedAt: new Date(),
                TransferItem: {
                    create: transferItems,
                },
            },
        });
    }

    console.log('✅ Created inventory transfers');

    // Create a specific retail customer for seed quotes to ensure tax calculation is consistent
    const seedCustomer = await prisma.customer.create({
        data: {
            id: randomUUID(),
            name: "Seed Customer",
            email: "seed.customer@example.com",
            customerType: CustomerType.RETAIL,
            taxExempt: false,
            updatedAt: new Date()
        }
    });

    // Create Quotes for RBAC testing
    const quote1 = await prisma.quote.create({
        data: {
            id: randomUUID(),
            quoteNumber: 'Q-SEED-001',
            locationId: locations[0].id,
            customerId: seedCustomer.id,
            createdById: users[0].id, // Admin
            status: QuoteStatus.PENDING,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            subtotal: 100,
            discountAmount: 0,
            taxAmount: 8.25,
            deliveryFee: 0,
            totalAmount: 108.25,
            updatedAt: new Date(),
            QuoteItem: {
                create: [{
                    id: randomUUID(),
                    productId: products[0].id,
                    quantity: 1,
                    unitPrice: 100,
                    discount: 0,
                    subtotal: 100
                }]
            }
        }
    });

    const quote2 = await prisma.quote.create({
        data: {
            id: randomUUID(),
            quoteNumber: 'Q-SEED-002',
            locationId: locations[0].id,
            customerId: seedCustomer.id,
            createdById: users[6].id, // Sales1
            status: QuoteStatus.PENDING,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            subtotal: 200,
            discountAmount: 0,
            taxAmount: 16.50,
            deliveryFee: 0,
            totalAmount: 216.50,
            updatedAt: new Date(),
            QuoteItem: {
                create: [{
                    id: randomUUID(),
                    productId: products[1].id,
                    quantity: 1,
                    unitPrice: 200,
                    discount: 0,
                    subtotal: 200
                }]
            }
        }
    });

    console.log('✅ Created seed quotes for RBAC testing');

    // Create Shipments for delivery schedule
    console.log('Creating delivery shipments...');
    
    const carriers = ['FedEx', 'UPS', 'USPS', 'DHL', 'Local Delivery'];
    const shipmentStatuses = [ShipmentStatus.SCHEDULED, ShipmentStatus.SCHEDULED, ShipmentStatus.SCHEDULED, ShipmentStatus.PENDING, ShipmentStatus.SHIPPED];
    
    // Get orders that need delivery (DELIVERY fulfillment type)
    const deliveryOrders = await prisma.order.findMany({
        where: {
            fulfillmentType: FulfillmentType.DELIVERY,
        },
        include: {
            OrderItem: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(8, 0, 0, 0); // Start of business day
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    for (let i = 0; i < deliveryOrders.length; i++) {
        const order = deliveryOrders[i];
        const status = randomItem(shipmentStatuses);
        
        // Create scheduled dates distributed over the next week
        const daysOut = Math.floor(i / 7); // Spread across 7 days
        const scheduledDate = new Date(today);
        scheduledDate.setDate(scheduledDate.getDate() + daysOut);
        
        // Set specific time slots (8 AM, 10 AM, 1 PM, 3 PM)
        const timeSlots = [8, 10, 13, 15];
        const hour = randomItem(timeSlots);
        scheduledDate.setHours(hour, 0, 0, 0);

        const shipment = await prisma.shipment.create({
            data: {
                id: randomUUID(),
                orderId: order.id,
                status,
                scheduledDate,
                duration: randomItem([60, 90, 120]), // 1, 1.5, or 2 hours
                carrier: randomItem(carriers),
                trackingNumber: status !== ShipmentStatus.PENDING ? `TRACK-${String(1000 + i).padStart(6, '0')}` : null,
                method: 'DELIVERY',
                createdAt: order.createdAt,
                updatedAt: new Date(),
            },
        });

        // Create shipment items for all order items
        const shipmentItems = order.OrderItem.map(item => ({
            id: randomUUID(),
            shipmentId: shipment.id,
            orderItemId: item.id,
            quantity: item.quantity,
        }));

        await prisma.shipmentItem.createMany({
            data: shipmentItems,
        });
    }

    console.log(`✅ Created ${deliveryOrders.length} delivery shipments`);

    console.log('');
    console.log('🎉 Bills Supplies seed complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  - ${locations.length} locations in Upstate NY`);
    console.log(`  - ${products.length} products across ${productCategories.length} categories`);
    console.log(`  - ${customers.length} customers`);
    console.log(`  - 3,000 transactions`);
    console.log(`  - ${users.length} users`);
    console.log('');
    console.log('📍 Locations:');
    console.log('  - AMHERST: 4250 Maple Road, Amherst, NY');
    console.log('  - BUFFALO: 1875 Main Street, Buffalo, NY');
    console.log('  - WESTCHESTER: 328 Central Avenue, White Plains, NY');
    console.log('  - ORCHARDPARK: 5680 Abbott Road, Orchard Park, NY');
    console.log('  - NIAGARA: 2450 Military Road, Niagara Falls, NY (Warehouse)');
    console.log('');
    console.log('👤 Login:');
    console.log('  - admin@billssupplies.com (password: password)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
