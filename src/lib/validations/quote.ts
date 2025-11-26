import { z } from 'zod';

export const quoteItemSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be non-negative"),
    discount: z.number().min(0, "Discount must be non-negative").optional().default(0),
});

export const createQuoteSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    items: z.array(quoteItemSchema).min(1, "At least one item is required"),
    deliveryAddress: z.string().optional(),
    notes: z.string().optional(),
    validityDays: z.number().int().min(1).max(365).optional().default(30),
});

export const updateQuoteSchema = z.object({
    items: z.array(quoteItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
