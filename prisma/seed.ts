import {
    PrismaClient,
    UserRole,
    CustomerType,
    OrderStatus,
    FulfillmentType,
    TransferStatus,
    AgentStatus,
    AgentScope
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌲 Seeding timbaOS Lumber Yard (Multi-Location)...');

    // Clear existing data (in correct order for foreign keys)
    await prisma.transferItem.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.locationInventory.deleteMany();
    await prisma.locationPricing.deleteMany();
    await prisma.userLocation.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    const users = await Promise.all([
        prisma.user.create({
            data: {
                email: 'admin@timbaos.com',
                name: 'Admin User',
                password: 'password', // In production, use bcrypt
                role: UserRole.SUPER_ADMIN,
            },
        }),
        prisma.user.create({
            data: {
                email: 'main.manager@timbaos.com',
                name: 'Sarah Johnson',
                password: 'hashed_password_here',
                role: UserRole.LOCATION_ADMIN,
            },
        }),
        prisma.user.create({
            data: {
                email: 'west.manager@timbaos.com',
                name: 'Mike Chen',
                password: 'hashed_password_here',
                role: UserRole.LOCATION_ADMIN,
            },
        }),
        prisma.user.create({
            data: {
                email: 'sales@timbaos.com',
                name: 'Tom Wilson',
                password: 'hashed_password_here',
                role: UserRole.SALES,
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create Locations
    const locations = await Promise.all([
        prisma.location.create({
            data: {
                code: 'MAIN',
                name: 'Main Yard',
                address: '100 Pine Street, Lumber City, ST 12345',
                phone: '555-0100',
                email: 'main@timbaos.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[1].id,
            },
        }),
        prisma.location.create({
            data: {
                code: 'WEST',
                name: 'Westside Branch',
                address: '450 West Avenue, Lumber City, ST 12346',
                phone: '555-0200',
                email: 'west@timbaos.com',
                isActive: true,
                isWarehouse: false,
                managerId: users[2].id,
            },
        }),
        prisma.location.create({
            data: {
                code: 'WARE',
                name: 'Distribution Warehouse',
                address: '1000 Industrial Parkway, Lumber City, ST 12347',
                phone: '555-0300',
                email: 'warehouse@timbaos.com',
                isActive: true,
                isWarehouse: true,
            },
        }),
    ]);

    console.log(`✅ Created ${locations.length} locations`);

    // Create User-Location Access
    await prisma.userLocation.createMany({
        data: [
            // Admin has access to all locations
            { userId: users[0].id, locationId: locations[0].id, canManage: true },
            { userId: users[0].id, locationId: locations[1].id, canManage: true },
            { userId: users[0].id, locationId: locations[2].id, canManage: true },
            // Main manager
            { userId: users[1].id, locationId: locations[0].id, canManage: true },
            // West manager
            { userId: users[2].id, locationId: locations[1].id, canManage: true },
            // Sales can access retail locations
            { userId: users[3].id, locationId: locations[0].id, canManage: false },
            { userId: users[3].id, locationId: locations[1].id, canManage: false },
        ],
    });

    console.log(`✅ Created user-location access`);

    // Create Products (Master Catalog)
    const products = await Promise.all([
        // Lumber
        prisma.product.create({
            data: {
                name: '2x4x8 Pressure Treated Pine',
                description: 'Standard framing lumber, pressure treated for outdoor use',
                sku: 'PT-2X4-8',
                basePrice: 8.97,
                category: 'Lumber',
                uom: 'EA',
            },
        }),
        prisma.product.create({
            data: {
                name: '2x6x10 Douglas Fir',
                description: 'Premium grade Douglas Fir for structural applications',
                sku: 'DF-2X6-10',
                basePrice: 18.45,
                category: 'Lumber',
                uom: 'EA',
            },
        }),
        prisma.product.create({
            data: {
                name: '4x4x8 Cedar Post',
                description: 'Naturally rot-resistant cedar fence post',
                sku: 'CD-4X4-8',
                basePrice: 24.99,
                category: 'Lumber',
                uom: 'EA',
            },
        }),
        prisma.product.create({
            data: {
                name: '1x6x8 Pine Board',
                description: 'Smooth finish pine board for trim and shelving',
                sku: 'PN-1X6-8',
                basePrice: 12.50,
                category: 'Lumber',
                uom: 'EA',
            },
        }),
        // Plywood
        prisma.product.create({
            data: {
                name: '4x8 1/2" CDX Plywood',
                description: 'Construction grade plywood for sheathing',
                sku: 'PLY-CDX-48',
                basePrice: 42.99,
                category: 'Plywood',
                uom: 'SHEET',
            },
        }),
        prisma.product.create({
            data: {
                name: '4x8 3/4" Oak Plywood',
                description: 'Hardwood veneer plywood for cabinetry',
                sku: 'PLY-OAK-48',
                basePrice: 89.99,
                category: 'Plywood',
                uom: 'SHEET',
            },
        }),
        // Hardware
        prisma.product.create({
            data: {
                name: 'Deck Screws 3" (5lb box)',
                description: 'Exterior grade coated deck screws',
                sku: 'HW-SCREW-3',
                basePrice: 19.99,
                category: 'Hardware',
                uom: 'BOX',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Framing Nails 16d (50lb box)',
                description: 'Hot-dipped galvanized framing nails',
                sku: 'HW-NAIL-16D',
                basePrice: 89.99,
                category: 'Hardware',
                uom: 'BOX',
            },
        }),
        // Concrete
        prisma.product.create({
            data: {
                name: '80lb Concrete Mix',
                description: 'Fast-setting concrete for posts and footings',
                sku: 'CON-MIX-80',
                basePrice: 6.99,
                category: 'Concrete',
                uom: 'BAG',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Rebar 1/2" x 10ft',
                description: 'Grade 60 steel reinforcement bar',
                sku: 'REB-12-10',
                basePrice: 8.50,
                category: 'Concrete',
                uom: 'EA',
            },
        }),
    ]);

    console.log(`✅ Created ${products.length} products in master catalog`);

    // Create Location Inventory - Main Yard
    await prisma.locationInventory.createMany({
        data: [
            { locationId: locations[0].id, productId: products[0].id, stockLevel: 450, reorderPoint: 100, aisle: 'A1' },
            { locationId: locations[0].id, productId: products[1].id, stockLevel: 220, reorderPoint: 50, aisle: 'A2' },
            { locationId: locations[0].id, productId: products[2].id, stockLevel: 8, reorderPoint: 20, aisle: 'A3' }, // Low stock
            { locationId: locations[0].id, productId: products[3].id, stockLevel: 180, reorderPoint: 40, aisle: 'A1' },
            { locationId: locations[0].id, productId: products[4].id, stockLevel: 3, reorderPoint: 10, aisle: 'B1' }, // Low stock
            { locationId: locations[0].id, productId: products[5].id, stockLevel: 6, reorderPoint: 5, aisle: 'B2' }, // Low stock
            { locationId: locations[0].id, productId: products[6].id, stockLevel: 145, reorderPoint: 30, aisle: 'C1' },
            { locationId: locations[0].id, productId: products[7].id, stockLevel: 32, reorderPoint: 10, aisle: 'C2' },
            { locationId: locations[0].id, productId: products[8].id, stockLevel: 280, reorderPoint: 100, aisle: 'D1' },
            { locationId: locations[0].id, productId: products[9].id, stockLevel: 5, reorderPoint: 15, aisle: 'D2' }, // Low stock
        ],
    });

    // Create Location Inventory - Westside Branch
    await prisma.locationInventory.createMany({
        data: [
            { locationId: locations[1].id, productId: products[0].id, stockLevel: 320, reorderPoint: 100, aisle: '1A' },
            { locationId: locations[1].id, productId: products[1].id, stockLevel: 150, reorderPoint: 50, aisle: '1B' },
            { locationId: locations[1].id, productId: products[2].id, stockLevel: 45, reorderPoint: 20, aisle: '2A' },
            { locationId: locations[1].id, productId: products[3].id, stockLevel: 90, reorderPoint: 40, aisle: '1A' },
            { locationId: locations[1].id, productId: products[4].id, stockLevel: 25, reorderPoint: 10, aisle: '3A' },
            { locationId: locations[1].id, productId: products[5].id, stockLevel: 12, reorderPoint: 5, aisle: '3B' },
            { locationId: locations[1].id, productId: products[6].id, stockLevel: 88, reorderPoint: 30, aisle: '4A' },
            { locationId: locations[1].id, productId: products[7].id, stockLevel: 18, reorderPoint: 10, aisle: '4B' },
            { locationId: locations[1].id, productId: products[8].id, stockLevel: 195, reorderPoint: 100, aisle: '5A' },
            { locationId: locations[1].id, productId: products[9].id, stockLevel: 28, reorderPoint: 15, aisle: '5B' },
        ],
    });

    // Create Location Inventory - Warehouse (higher quantities)
    await prisma.locationInventory.createMany({
        data: [
            { locationId: locations[2].id, productId: products[0].id, stockLevel: 2500, reorderPoint: 500 },
            { locationId: locations[2].id, productId: products[1].id, stockLevel: 1800, reorderPoint: 300 },
            { locationId: locations[2].id, productId: products[2].id, stockLevel: 600, reorderPoint: 150 },
            { locationId: locations[2].id, productId: products[3].id, stockLevel: 1200, reorderPoint: 250 },
            { locationId: locations[2].id, productId: products[4].id, stockLevel: 400, reorderPoint: 80 },
            { locationId: locations[2].id, productId: products[5].id, stockLevel: 250, reorderPoint: 50 },
            { locationId: locations[2].id, productId: products[6].id, stockLevel: 800, reorderPoint: 200 },
            { locationId: locations[2].id, productId: products[7].id, stockLevel: 350, reorderPoint: 75 },
            { locationId: locations[2].id, productId: products[8].id, stockLevel: 5000, reorderPoint: 1000 },
            { locationId: locations[2].id, productId: products[9].id, stockLevel: 900, reorderPoint: 200 },
        ],
    });

    console.log(`✅ Created location inventory for all locations`);

    // Create Location-Specific Pricing (West branch has slightly higher prices)
    await prisma.locationPricing.createMany({
        data: [
            { locationId: locations[1].id, productId: products[0].id, price: 9.47, cost: 6.50 },
            { locationId: locations[1].id, productId: products[1].id, price: 19.95, cost: 13.00 },
            { locationId: locations[1].id, productId: products[2].id, price: 26.99, cost: 18.00 },
        ],
    });

    console.log(`✅ Created location-specific pricing`);

    // Create Customers
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'ABC Construction LLC',
                email: 'orders@abcconstruction.com',
                phone: '555-0101',
                address: '123 Builder Ave, Construction City, ST 12345',
                customerType: CustomerType.CONTRACTOR,
                accountNumber: 'ACC-001',
                creditLimit: 50000,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'HomeOwner Joe',
                email: 'joe.homeowner@email.com',
                phone: '555-0202',
                address: '456 Residential St, Suburbia, ST 67890',
                customerType: CustomerType.RETAIL,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Premier Decks & Fencing',
                email: 'info@premierdecks.com',
                phone: '555-0303',
                address: '789 Contractor Blvd, Tradesville, ST 11223',
                customerType: CustomerType.CONTRACTOR,
                accountNumber: 'ACC-002',
                creditLimit: 75000,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'City School District',
                email: 'facilities@cityschools.edu',
                phone: '555-0404',
                address: '321 Education Way, Schooltown, ST 44556',
                customerType: CustomerType.WHOLESALE,
                accountNumber: 'ACC-003',
                creditLimit: 100000,
                taxExempt: true,
                taxId: 'TAX-EXEMPT-001',
            },
        }),
    ]);

    console.log(`✅ Created ${customers.length} customers`);

    // Create Orders for Main Location
    await prisma.order.create({
        data: {
            orderNumber: 'ORD-001',
            locationId: locations[0].id,
            customerId: customers[0].id,
            status: OrderStatus.COMPLETED,
            totalAmount: 1247.83,
            fulfillmentType: FulfillmentType.DELIVERY,
            deliveryAddress: customers[0].address!,
            deliveryFee: 75.00,
            salesRepId: users[3].id,
            items: {
                create: [
                    { productId: products[0].id, quantity: 50, price: 8.97 },
                    { productId: products[4].id, quantity: 15, price: 42.99 },
                    { productId: products[6].id, quantity: 3, price: 19.99 },
                ],
            },
            subtotal: 1172.83,
        },
    });

    await prisma.order.create({
        data: {
            orderNumber: 'ORD-002',
            locationId: locations[0].id,
            customerId: customers[1].id,
            status: OrderStatus.PENDING,
            totalAmount: 327.84,
            fulfillmentType: FulfillmentType.PICKUP,
            salesRepId: users[3].id,
            items: {
                create: [
                    { productId: products[2].id, quantity: 12, price: 24.99 },
                    { productId: products[8].id, quantity: 4, price: 6.99 },
                ],
            },
            subtotal: 327.84,
        },
    });

    // Create Orders for West Location
    await prisma.order.create({
        data: {
            orderNumber: 'ORD-003',
            locationId: locations[1].id,
            customerId: customers[2].id,
            status: OrderStatus.COMPLETED,
            totalAmount: 2204.90,
            fulfillmentType: FulfillmentType.DELIVERY,
            deliveryAddress: customers[2].address!,
            deliveryFee: 85.00,
            items: {
                create: [
                    { productId: products[0].id, quantity: 100, price: 9.47 }, // Location-specific price
                    { productId: products[1].id, quantity: 60, price: 19.95 },
                    { productId: products[6].id, quantity: 10, price: 19.99 },
                ],
            },
            subtotal: 2119.90,
        },
    });

    await prisma.order.create({
        data: {
            orderNumber: 'ORD-004',
            locationId: locations[1].id,
            customerId: customers[3].id,
            status: OrderStatus.PENDING,
            totalAmount: 5432.10,
            fulfillmentType: FulfillmentType.DELIVERY,
            deliveryAddress: customers[3].address!,
            deliveryFee: 0, // Tax exempt customer, no delivery fee
            items: {
                create: [
                    { productId: products[0].id, quantity: 200, price: 9.47 },
                    { productId: products[1].id, quantity: 150, price: 19.95 },
                    { productId: products[8].id, quantity: 100, price: 6.99 },
                ],
            },
            subtotal: 5432.10,
        },
    });

    console.log(`✅ Created 4 orders across locations`);

    // Create Inventory Transfer
    await prisma.inventoryTransfer.create({
        data: {
            transferNumber: 'TXF-001',
            originLocationId: locations[2].id, // From warehouse
            destinationLocationId: locations[0].id, // To main yard
            status: TransferStatus.RECEIVED,
            requestedById: users[1].id,
            approvedById: users[0].id,
            requestedAt: new Date('2024-01-15'),
            approvedAt: new Date('2024-01-15'),
            shippedAt: new Date('2024-01-16'),
            receivedAt: new Date('2024-01-17'),
            notes: 'Restocking main yard for busy season',
            items: {
                create: [
                    { productId: products[2].id, requestedQty: 50, shippedQty: 50, receivedQty: 50 },
                    { productId: products[4].id, requestedQty: 30, shippedQty: 30, receivedQty: 30 },
                ],
            },
        },
    });

    await prisma.inventoryTransfer.create({
        data: {
            transferNumber: 'TXF-002',
            originLocationId: locations[2].id, // From warehouse
            destinationLocationId: locations[0].id, // To main yard
            status: TransferStatus.PENDING,
            requestedById: users[1].id,
            notes: 'Low stock emergency restock - Cedar posts and plywood',
            items: {
                create: [
                    { productId: products[2].id, requestedQty: 25 },
                    { productId: products[4].id, requestedQty: 20 },
                    { productId: products[9].id, requestedQty: 30 },
                ],
            },
        },
    });

    console.log(`✅ Created inventory transfers`);

    // Create Agents per location
    await prisma.agent.create({
        data: {
            name: 'StockWatcher - Main',
            type: 'INVENTORY_WATCHER',
            status: AgentStatus.ACTIVE,
            scope: AgentScope.LOCATION,
            locationId: locations[0].id,
            lastRun: new Date(),
            config: {
                threshold: 10,
                checkInterval: 3600,
            },
        },
    });

    await prisma.agent.create({
        data: {
            name: 'StockWatcher - West',
            type: 'INVENTORY_WATCHER',
            status: AgentStatus.ACTIVE,
            scope: AgentScope.LOCATION,
            locationId: locations[1].id,
            lastRun: new Date(),
            config: {
                threshold: 10,
                checkInterval: 3600,
            },
        },
    });

    await prisma.agent.create({
        data: {
            name: 'Global Analytics Agent',
            type: 'SALES_ANALYST',
            status: AgentStatus.ACTIVE,
            scope: AgentScope.GLOBAL,
            config: {
                analysisInterval: 86400, // Daily
            },
        },
    });

    console.log('✅ Created AI agents');
    console.log('🎉 Multi-location seed complete!');
    console.log('');
    console.log('📍 Locations:');
    console.log('  - MAIN: Main Yard (Manager: Sarah Johnson)');
    console.log('  - WEST: Westside Branch (Manager: Mike Chen)');
    console.log('  - WARE: Distribution Warehouse');
    console.log('');
    console.log('👥 Users:');
    console.log('  - admin@timbaos.com (SUPER_ADMIN)');
    console.log('  - main.manager@timbaos.com (LOCATION_ADMIN)');
    console.log('  - west.manager@timbaos.com (LOCATION_ADMIN)');
    console.log('  - sales@timbaos.com (SALES)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
