import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBillOrders() {
  console.log('Checking for customers named Bill or William...\n');

  // Find customers with Bill or William in their names
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: 'Bill', mode: 'insensitive' } },
        { name: { contains: 'William', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: { Order: true },
      },
    },
  });

  console.log(`Found ${customers.length} customers:\n`);
  customers.forEach(c => {
    console.log(`  - ${c.name} (${c._count.Order} orders)`);
  });

  // Get some sample orders
  console.log('\n\nSample orders from these customers:\n');
  
  for (const customer of customers.slice(0, 3)) {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        OrderItem: {
          include: {
            Product: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
      },
      take: 2,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n${customer.name}:`);
    orders.forEach(order => {
      console.log(`  Order ${order.orderNumber} - $${order.totalAmount} (${order.OrderItem.length} items)`);
      order.OrderItem.forEach(item => {
        console.log(`    - ${item.quantity}x ${item.Product.name} (${item.Product.category})`);
      });
    });
  }

  await prisma.$disconnect();
}

checkBillOrders().catch(console.error);
