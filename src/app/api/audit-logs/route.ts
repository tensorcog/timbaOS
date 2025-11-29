import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');

        if (!entityType || !entityId) {
            return NextResponse.json({ error: 'Missing entityType or entityId' }, { status: 400 });
        }

        const logs = await prisma.auditLog.findMany({
            where: {
                entityType,
                entityId,
            },
            include: {
                User: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        const formattedLogs = logs.map(log => ({
            ...log,
            user: log.User,
            User: undefined, // Remove the original key
        }));

        return NextResponse.json(formattedLogs);
    } catch (error) {
        logApiError('Audit log fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }
}
