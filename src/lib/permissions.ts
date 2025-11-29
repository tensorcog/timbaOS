import { UserRole } from '@prisma/client';

/**
 * Check if a user has access to a specific location
 * Uses JWT session data instead of querying database
 */
export function checkLocationAccess(
    userLocationIds: string[],
    locationId: string
): boolean {
    return userLocationIds.includes(locationId);
}

/**
 * Check if a user can manage a specific location
 * For administrative roles, returns true immediately
 * For others, checks if location is in their assigned list
 */
export function canManageLocation(
    userRole: UserRole,
    userLocationIds: string[],
    locationId: string
): boolean {
    // Super admins and location admins can manage all locations
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        return true;
    }

    // Managers can only manage their assigned locations
    if (userRole === UserRole.MANAGER) {
        return userLocationIds.includes(locationId);
    }

    return false;
}

/**
 * Check if a user has a specific role or higher
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
        SUPER_ADMIN: 5,
        LOCATION_ADMIN: 4,
        MANAGER: 3,
        SALES: 2,
        WAREHOUSE: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user can edit a resource (quote, order, etc.)
 * Uses session data instead of querying database
 */
export function canEditResource(
    userRole: UserRole,
    userId: string,
    userLocationIds: string[],
    resource: {
        createdById?: string | null;
        salesRepId?: string | null;
        locationId?: string;
    }
): boolean {
    // Super admins and location admins can edit everything
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        return true;
    }

    // Managers can edit resources in their locations
    if (userRole === UserRole.MANAGER && resource.locationId) {
        return userLocationIds.includes(resource.locationId);
    }

    // Sales can only edit their own resources
    if (userRole === UserRole.SALES) {
        return resource.createdById === userId || resource.salesRepId === userId;
    }

    return false;
}

/**
 * Check if a user can approve transfers
 */
export function canApproveTransfer(userRole: UserRole): boolean {
    return userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.LOCATION_ADMIN ||
        userRole === UserRole.MANAGER;
}

/**
 * Check if a user can access analytics
 */
export function canAccessAnalytics(userRole: UserRole): boolean {
    return userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.LOCATION_ADMIN ||
        userRole === UserRole.MANAGER;
}

/**
 * Filter items by user's assigned locations
 */
export function filterByUserLocations<T extends Record<string, any>>(
    items: T[],
    userLocationIds: string[],
    locationKey: keyof T
): T[] {
    return items.filter(item => {
        const itemLocationId = item[locationKey];
        return typeof itemLocationId === 'string' && userLocationIds.includes(itemLocationId);
    });
}

/**
 * Filter items by ownership (createdBy or salesRep)
 */
export function filterByOwnership<T extends Record<string, any>>(
    items: T[],
    userId: string,
    ownerKeys: (keyof T)[]
): T[] {
    return items.filter(item => {
        return ownerKeys.some(key => item[key] === userId);
    });
}
