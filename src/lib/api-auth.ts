import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserRole } from '@prisma/client';
import { checkLocationAccess, hasRole } from './permissions';

/**
 * Middleware to check if user is authenticated and has required role
 */
export async function requireAuth(
    request: NextRequest,
    options?: {
        roles?: UserRole[];
        locationId?: string;
    }
): Promise<{ error?: NextResponse; session?: any }> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    // Check role if specified
    if (options?.roles && options.roles.length > 0) {
        const userRole = session.user.role as UserRole;
        const hasRequiredRole = options.roles.some(role => hasRole(userRole, role));

        if (!hasRequiredRole) {
            return {
                error: NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 }),
            };
        }
    }

    // Check location access if specified
    if (options?.locationId) {
        const hasAccess = await checkLocationAccess(session.user.id, options.locationId);

        if (!hasAccess) {
            return {
                error: NextResponse.json({ error: 'Forbidden - No access to this location' }, { status: 403 }),
            };
        }
    }

    return { session };
}

/**
 * Check if user can access a location (either has direct access or is admin)
 */
export function canAccessLocation(
    session: any,
    locationId: string
): boolean {
    const userRole = session.user.role as UserRole;

    // Super admins and location admins have access to all locations
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        return true;
    }

    // Check if location is in user's assigned locations
    return session.user.locationIds?.includes(locationId) || false;
}

/**
 * Filter query conditions by user's location access
 */
export function getLocationFilter(session: any): { locationId?: { in: string[] } } {
    const userRole = session.user.role as UserRole;

    // Admins see all locations
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        return {};
    }

    // Other users only see their assigned locations
    return {
        locationId: {
            in: session.user.locationIds || [],
        },
    };
}

/**
 * Check if user owns a resource (created it or is assigned as sales rep)
 */
export function isResourceOwner(
    session: any,
    resource: {
        createdById?: string | null;
        salesRepId?: string | null;
    }
): boolean {
    return (
        resource.createdById === session.user.id ||
        resource.salesRepId === session.user.id
    );
}
