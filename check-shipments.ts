import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShipments() {
  const shipments = await prisma.shipment.findMany({
    take: 5,
    orderBy: { scheduledDate: 'asc' },
    include: {
      Order: {
        include: {
          Customer: true,
        },
      },
    },
  });

  console.log('✅ Sample upcoming shipments:');
  shipments.forEach(s => {
    console.log(`- ${s.Order.orderNumber} for ${s.Order.Customer.name}`);
    console.log(`  Scheduled: ${s.scheduledDate?.toLocaleString()}`);
    console.log(`  Status: ${s.status} | Carrier: ${s.carrier}`);
  });

  const total = await prisma.shipment.count();
  console.log(`\n📦 Total shipments: ${total}`);

  await prisma.$disconnect();
}

checkShipments().catch(console.error);
