import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CONVERT_TO_ORDER' | 'CREATE_FROM_QUOTE';
export type EntityType = 'Quote' | 'Order' | 'Product' | 'Customer' | 'Inventory' | 'Invoice';

interface AuditLogParams {
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    userId: string;
    changes: Record<string, { old?: any; new?: any }>;
    ipAddress?: string;
    userAgent?: string;
}

export async function logActivity({
    entityType,
    entityId,
    action,
    userId,
    changes,
    ipAddress,
    userAgent,
}: AuditLogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                id: randomUUID(),
                entityType,
                entityId,
                action,
                userId,
                changes,
                ipAddress,
                userAgent,
            },
        });
    } catch (error) {
        logger.error({ error, entityType, entityId, action }, 'Failed to create audit log');
    }
}
