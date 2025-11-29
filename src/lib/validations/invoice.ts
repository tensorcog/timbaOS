import { z } from 'zod';

/**
 * Validation schemas for invoice-related API endpoints
 * Prevents data corruption, injection attacks, and invalid inputs
 */

// ===== COMMON SCHEMAS =====

export const uuidSchema = z.string().uuid('Invalid ID format');

export const positiveDecimalSchema = z
  .number()
  .positive('Must be a positive number')
  .finite('Must be a finite number')
  .refine((val) => !isNaN(val), 'Must be a valid number');

export const nonNegativeDecimalSchema = z
  .number()
  .nonnegative('Must be non-negative')
  .finite('Must be a finite number')
  .refine((val) => !isNaN(val), 'Must be a valid number');

export const emailSchema = z.string().email('Invalid email address');

// ===== INVOICE CREATION =====

export const invoiceItemSchema = z.object({
  productId: uuidSchema,
  description: z.string().max(500, 'Description too long').optional(),
  quantity: positiveDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  discount: nonNegativeDecimalSchema.default(0),
});

export const createInvoiceSchema = z.object({
  customerId: uuidSchema,
  locationId: uuidSchema,
  orderId: uuidSchema.optional(),
  quoteId: uuidSchema.optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
  dueDate: z.string().datetime().optional(),
  paymentTermDays: z.number().int().min(0).max(365).default(30),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  discountAmount: nonNegativeDecimalSchema.default(0),
  deliveryFee: nonNegativeDecimalSchema.default(0),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
});

// ===== INVOICE PAYMENT =====

export const createPaymentSchema = z.object({
  invoiceId: uuidSchema.optional(),
  customerId: uuidSchema,
  amount: positiveDecimalSchema,
  paymentMethod: z.enum([
    'CASH',
    'CHECK',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'ACH',
    'WIRE_TRANSFER',
  ]),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  paymentDate: z.string().datetime().optional(),
});

// ===== EMAIL SENDING =====

export const sendInvoiceEmailSchema = z.object({
  customerEmail: emailSchema.optional(),
});

// ===== STRIPE PAYMENT =====

export const createPaymentIntentSchema = z.object({
  invoiceId: uuidSchema,
  amount: positiveDecimalSchema,
  customerId: uuidSchema,
  description: z.string().max(500).optional(),
});

// ===== QUERY PARAMETERS =====

export const invoiceQuerySchema = z.object({
  customerId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ===== VALIDATION HELPER =====

/**
 * Validates data against schema and returns typed result
 * @throws {z.ZodError} if validation fails
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates data and returns result with errors
 */
export function safeValidateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Formats Zod errors for API response
 */
export function formatZodErrors(errors: z.ZodIssue[]): string {
  return errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}
