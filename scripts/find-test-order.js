
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      status: { not: 'COMPLETED' },
      OrderItem: { some: {} }
    },
    include: {
      OrderItem: true,
      Shipment: {
        include: {
            ShipmentItem: true
        }
      }
    }
  });

  if (order) {
    console.log(`Found order: ${order.id}`);
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Items: ${order.OrderItem.length}`);
    console.log(`Shipments: ${order.Shipment.length}`);
    order.OrderItem.forEach(item => {
        console.log(`Item: ${item.id}, Qty: ${item.quantity}`);
    });
  } else {
    console.log('No suitable order found');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
