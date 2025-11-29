import { Prisma } from '@prisma/client';

// Models that support soft deletes
const SOFT_DELETE_MODELS = ['Customer', 'Order', 'Quote', 'Invoice'];

/**
 * Prisma middleware to automatically filter out soft-deleted records
 * 
 * This middleware intercepts queries for models with deletedAt fields
 * and automatically adds a filter to exclude soft-deleted records.
 * 
 * To query soft-deleted records explicitly, use:
 * { deletedAt: { not: null } }
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
