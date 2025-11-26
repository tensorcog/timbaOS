import prisma from '@/lib/prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'Quote' | 'Order' | 'Product' | 'Customer' | 'Inventory';

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
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent blocking the main operation
    }
}
