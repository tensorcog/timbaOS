import { PrismaClient } from '@prisma/client';
import { softDeleteMiddleware } from './prisma-middleware';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

// Apply soft delete middleware
prisma.$use(softDeleteMiddleware());

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
