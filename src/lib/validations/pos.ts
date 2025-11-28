import { z } from 'zod';

// POS Checkout Validation Schemas
export const posCheckoutItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().nonnegative('Price must be non-negative'),
    discount: z.number().nonnegative('Discount must be non-negative').optional().default(0),
});

export const posPaymentSchema = z.object({
    method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'ACCOUNT', 'WIRE_TRANSFER']),
    amount: z.number().positive('Payment amount must be positive'),
});

export const posCheckoutSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    items: z.array(posCheckoutItemSchema).min(1, 'At least one item is required'),
    payments: z.array(posPaymentSchema).min(1, 'At least one payment is required'),
});

// TypeScript types derived from schemas
export type PosCheckoutItem = z.infer<typeof posCheckoutItemSchema>;
export type PosPayment = z.infer<typeof posPaymentSchema>;
export type PosCheckoutRequest = z.infer<typeof posCheckoutSchema>;
