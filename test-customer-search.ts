import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const william = await prisma.customer.findFirst({ where: { name: { contains: 'William', mode: 'insensitive' } } });
  console.log('William search:', william?.name);
  
  const bill = await prisma.customer.findFirst({ where: { name: { contains: 'Bill', mode: 'insensitive' } } });
  console.log('Bill search:', bill?.name);
  
  await prisma.$disconnect();
}

test().catch(console.error);
