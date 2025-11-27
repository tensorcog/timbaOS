import prisma from './prisma';
import { UserRole } from '@prisma/client';

/**
 * Check if a user has access to a specific location
 */
export async function checkLocationAccess(
    userId: string,
    locationId: string
): Promise<boolean> {
    const userLocation = await prisma.userLocation.findUnique({
        where: {
            userId_locationId: {
                userId,
                locationId,
            },
        },
    });

    return !!userLocation;
}

/**
 * Get all location IDs a user has access to
 */
export async function getUserLocations(userId: string): Promise<string[]> {
    const userLocations = await prisma.userLocation.findMany({
        where: { userId },
        select: { locationId: true },
    });

    return userLocations.map(ul => ul.locationId);
}

/**
 * Check if a user can manage a specific location
 */
export async function canManageLocation(
    userId: string,
    locationId: string
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    // Super admins and location admins can manage all locations
    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.LOCATION_ADMIN) {
        return true;
    }

    // Check if user has manager permission for this location
    const userLocation = await prisma.userLocation.findUnique({
        where: {
            userId_locationId: {
                userId,
                locationId,
            },
        },
    });

    return userLocation?.canManage || false;
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
 */
export async function canEditResource(
    userId: string,
    resource: {
        createdById?: string | null;
        salesRepId?: string | null;
        locationId?: string;
    }
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (!user) return false;

    // Super admins and location admins can edit everything
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.LOCATION_ADMIN) return true;

    // Managers can edit resources in their locations
    if (user.role === UserRole.MANAGER && resource.locationId) {
        return await canManageLocation(userId, resource.locationId);
    }

    // Sales can only edit their own resources
    if (user.role === UserRole.SALES) {
        return resource.createdById === userId || resource.salesRepId === userId;
    }

    return false;
}

/**
 * Check if a user can approve transfers
 */
export async function canApproveTransfer(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    return user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.LOCATION_ADMIN || user?.role === UserRole.MANAGER;
}

/**
 * Check if a user can access analytics
 */
export async function canAccessAnalytics(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    // Only admins and managers can access full analytics
    return user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.LOCATION_ADMIN || user?.role === UserRole.MANAGER;
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
