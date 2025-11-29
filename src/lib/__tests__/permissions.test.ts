import { UserRole } from '@prisma/client';
import {
    hasRole,
    filterByUserLocations,
    filterByOwnership,
} from '../permissions';

describe('Permissions', () => {
    describe('hasRole', () => {
        describe('SUPER_ADMIN', () => {
            it('should have access to all roles', () => {
                expect(hasRole(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(true);
                expect(hasRole(UserRole.SUPER_ADMIN, UserRole.LOCATION_ADMIN)).toBe(true);
                expect(hasRole(UserRole.SUPER_ADMIN, UserRole.MANAGER)).toBe(true);
                expect(hasRole(UserRole.SUPER_ADMIN, UserRole.SALES)).toBe(true);
                expect(hasRole(UserRole.SUPER_ADMIN, UserRole.WAREHOUSE)).toBe(true);
            });
        });

        describe('LOCATION_ADMIN', () => {
            it('should have access to LOCATION_ADMIN and below', () => {
                expect(hasRole(UserRole.LOCATION_ADMIN, UserRole.SUPER_ADMIN)).toBe(false);
                expect(hasRole(UserRole.LOCATION_ADMIN, UserRole.LOCATION_ADMIN)).toBe(true);
                expect(hasRole(UserRole.LOCATION_ADMIN, UserRole.MANAGER)).toBe(true);
                expect(hasRole(UserRole.LOCATION_ADMIN, UserRole.SALES)).toBe(true);
                expect(hasRole(UserRole.LOCATION_ADMIN, UserRole.WAREHOUSE)).toBe(true);
            });
        });

        describe('MANAGER', () => {
            it('should have access to MANAGER and below', () => {
                expect(hasRole(UserRole.MANAGER, UserRole.SUPER_ADMIN)).toBe(false);
                expect(hasRole(UserRole.MANAGER, UserRole.LOCATION_ADMIN)).toBe(false);
                expect(hasRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
                expect(hasRole(UserRole.MANAGER, UserRole.SALES)).toBe(true);
                expect(hasRole(UserRole.MANAGER, UserRole.WAREHOUSE)).toBe(true);
            });
        });

        describe('SALES', () => {
            it('should have access to SALES and below', () => {
                expect(hasRole(UserRole.SALES, UserRole.SUPER_ADMIN)).toBe(false);
                expect(hasRole(UserRole.SALES, UserRole.LOCATION_ADMIN)).toBe(false);
                expect(hasRole(UserRole.SALES, UserRole.MANAGER)).toBe(false);
                expect(hasRole(UserRole.SALES, UserRole.SALES)).toBe(true);
                expect(hasRole(UserRole.SALES, UserRole.WAREHOUSE)).toBe(true);
            });
        });

        describe('WAREHOUSE', () => {
            it('should only have access to WAREHOUSE', () => {
                expect(hasRole(UserRole.WAREHOUSE, UserRole.SUPER_ADMIN)).toBe(false);
                expect(hasRole(UserRole.WAREHOUSE, UserRole.LOCATION_ADMIN)).toBe(false);
                expect(hasRole(UserRole.WAREHOUSE, UserRole.MANAGER)).toBe(false);
                expect(hasRole(UserRole.WAREHOUSE, UserRole.SALES)).toBe(false);
                expect(hasRole(UserRole.WAREHOUSE, UserRole.WAREHOUSE)).toBe(true);
            });
        });
    });

    describe('filterByUserLocations', () => {
        const testItems = [
            { id: '1', locationId: 'loc-A', name: 'Item 1' },
            { id: '2', locationId: 'loc-B', name: 'Item 2' },
            { id: '3', locationId: 'loc-C', name: 'Item 3' },
            { id: '4', locationId: 'loc-A', name: 'Item 4' },
            { id: '5', locationId: 'loc-D', name: 'Item 5' },
        ];

        it('should filter items by user locations', () => {
            const userLocationIds = ['loc-A', 'loc-B'];
            const filtered = filterByUserLocations(testItems, userLocationIds, 'locationId');

            expect(filtered).toHaveLength(3);
            expect(filtered.map(i => i.id)).toEqual(['1', '2', '4']);
        });

        it('should return empty array if no locations match', () => {
            const userLocationIds = ['loc-X', 'loc-Y'];
            const filtered = filterByUserLocations(testItems, userLocationIds, 'locationId');

            expect(filtered).toHaveLength(0);
        });

        it('should return all items if user has access to all locations', () => {
            const userLocationIds = ['loc-A', 'loc-B', 'loc-C', 'loc-D'];
            const filtered = filterByUserLocations(testItems, userLocationIds, 'locationId');

            expect(filtered).toHaveLength(5);
        });

        it('should return empty array for empty user locations', () => {
            const userLocationIds: string[] = [];
            const filtered = filterByUserLocations(testItems, userLocationIds, 'locationId');

            expect(filtered).toHaveLength(0);
        });

        it('should return empty array for empty items', () => {
            const userLocationIds = ['loc-A'];
            const filtered = filterByUserLocations([], userLocationIds, 'locationId');

            expect(filtered).toHaveLength(0);
        });

        it('should work with different location key names', () => {
            const items = [
                { id: '1', branchId: 'loc-A' },
                { id: '2', branchId: 'loc-B' },
            ];
            const userLocationIds = ['loc-A'];
            const filtered = filterByUserLocations(items, userLocationIds, 'branchId');

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('1');
        });

        it('should ignore items with null or undefined locationId', () => {
            const itemsWithNulls = [
                { id: '1', locationId: 'loc-A' },
                { id: '2', locationId: null },
                { id: '3', locationId: undefined },
            ];
            const userLocationIds = ['loc-A'];
            const filtered = filterByUserLocations(itemsWithNulls as any, userLocationIds, 'locationId');

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('1');
        });
    });

    describe('filterByOwnership', () => {
        const testItems = [
            { id: '1', createdById: 'user-A', salesRepId: 'user-B' },
            { id: '2', createdById: 'user-B', salesRepId: 'user-C' },
            { id: '3', createdById: 'user-C', salesRepId: 'user-A' },
            { id: '4', createdById: 'user-A', salesRepId: 'user-A' },
            { id: '5', createdById: 'user-D', salesRepId: 'user-D' },
        ];

        it('should filter by createdById', () => {
            const userId = 'user-A';
            const filtered = filterByOwnership(testItems, userId, ['createdById']);

            expect(filtered).toHaveLength(2);
            expect(filtered.map(i => i.id)).toEqual(['1', '4']);
        });

        it('should filter by salesRepId', () => {
            const userId = 'user-A';
            const filtered = filterByOwnership(testItems, userId, ['salesRepId']);

            expect(filtered).toHaveLength(2);
            expect(filtered.map(i => i.id)).toEqual(['3', '4']);
        });

        it('should filter by multiple ownership keys (OR logic)', () => {
            const userId = 'user-A';
            const filtered = filterByOwnership(testItems, userId, ['createdById', 'salesRepId']);

            expect(filtered).toHaveLength(3);
            expect(filtered.map(i => i.id)).toEqual(['1', '3', '4']);
        });

        it('should return empty array if no items match', () => {
            const userId = 'user-X';
            const filtered = filterByOwnership(testItems, userId, ['createdById']);

            expect(filtered).toHaveLength(0);
        });

        it('should return empty array for empty items', () => {
            const userId = 'user-A';
            const filtered = filterByOwnership([], userId, ['createdById']);

            expect(filtered).toHaveLength(0);
        });

        it('should return empty array for empty ownership keys', () => {
            const userId = 'user-A';
            const filtered = filterByOwnership(testItems, userId, []);

            expect(filtered).toHaveLength(0);
        });

        it('should handle null ownership values', () => {
            const itemsWithNulls = [
                { id: '1', createdById: 'user-A', salesRepId: null },
                { id: '2', createdById: null, salesRepId: 'user-A' },
                { id: '3', createdById: null, salesRepId: null },
            ];
            const userId = 'user-A';
            const filtered = filterByOwnership(itemsWithNulls as any, userId, ['createdById', 'salesRepId']);

            expect(filtered).toHaveLength(2);
            expect(filtered.map(i => i.id)).toEqual(['1', '2']);
        });
    });

    describe('Role Hierarchy', () => {
        it('should maintain correct hierarchy order', () => {
            const roles = [
                UserRole.WAREHOUSE,
                UserRole.SALES,
                UserRole.MANAGER,
                UserRole.LOCATION_ADMIN,
                UserRole.SUPER_ADMIN,
            ];

            // Each role should have access to itself and below
            for (let i = 0; i < roles.length; i++) {
                for (let j = 0; j <= i; j++) {
                    expect(hasRole(roles[i], roles[j])).toBe(true);
                }
                for (let j = i + 1; j < roles.length; j++) {
                    expect(hasRole(roles[i], roles[j])).toBe(false);
                }
            }
        });
    });
});
