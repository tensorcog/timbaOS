import { Prisma } from '@prisma/client';

// Models that support soft deletes
const SOFT_DELETE_MODELS = ['Customer', 'Order', 'Quote', 'Invoice'];

/**
 * Soft Delete Middleware for Prisma
 * 
 * IMPORTANT: This middleware automatically modifies query behavior for models with soft deletes.
 * 
 * ## Behavioral Changes:
 * 
 * 1. **findUnique → findFirst conversion**
 *    - Automatically converts `findUnique` to `findFirst` with `deletedAt: null` filter
 *    - WARNING: Breaks unique constraint violation detection
 *    - Example: Creating duplicate SKUs won't throw errors as expected
 * 
 * 2. **delete → soft delete**
 *    - Converts `delete` operations to `update` with `deletedAt: new Date()`
 *    - Records are never actually deleted from database
 * 
 * 3. **Automatic filtering**
 *    - All find operations automatically filter `deletedAt: null`
 *    - Soft-deleted records are invisible by default
 * 
 * ## Usage Examples:
 * 
 * ```typescript
 * // Query non-deleted records (default behavior)
 * const customers = await prisma.customer.findMany({});
 * 
 * // Query soft-deleted records explicitly
 * const deleted = await prisma.customer.findMany({
 *   where: { deletedAt: { not: null } }
 * });
 * 
 * // Query ALL records (including deleted)
 * const all = await prisma.customer.findMany({
 *   where: { OR: [{ deletedAt: null }, { deletedAt: { not: null } }] }
 * });
 * 
 * // Soft delete a record
 * await prisma.customer.delete({ where: { id: 'xxx' } });
 * // Actually executes: update with deletedAt: new Date()
 * 
 * // Hard delete (bypass middleware)
 * await prisma.$executeRaw`DELETE FROM "Customer" WHERE id = ${id}`;
 * ```
 * 
 * @returns Prisma middleware function
 */
export function softDeleteMiddleware(): Prisma.Middleware {
    return async (params, next) => {
        if (SOFT_DELETE_MODELS.includes(params.model || '')) {
            // For findUnique, convert to findFirst with deletedAt filter
            if (params.action === 'findUnique') {
                params.action = 'findFirst';
                params.args.where = { ...params.args.where, deletedAt: null };
            }

            // For findFirst, add deletedAt filter
            if (params.action === 'findFirst') {
                if (!params.args) params.args = {};
                if (!params.args.where) params.args.where = {};
                params.args.where = { ...params.args.where, deletedAt: null };
            }

            // For findMany, add deletedAt filter
            if (params.action === 'findMany') {
                if (!params.args) params.args = {};
                if (!params.args.where) params.args.where = {};
                params.args.where = { ...params.args.where, deletedAt: null };
            }

            // For update/updateMany, add deletedAt filter
            if (params.action === 'update' || params.action === 'updateMany') {
                if (!params.args) params.args = {};
                if (!params.args.where) params.args.where = {};
                params.args.where = { ...params.args.where, deletedAt: null };
            }

            // For delete, convert to update with deletedAt set
            if (params.action === 'delete') {
                params.action = 'update';
                params.args.data = { deletedAt: new Date() };
            }

            // For deleteMany, convert to updateMany with deletedAt set
            if (params.action === 'deleteMany') {
                params.action = 'updateMany';
                params.args.data = { deletedAt: new Date() };
            }
        }

        return next(params);
    };
}
