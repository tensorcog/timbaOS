/**
 * Branded Types for Type-Safe IDs
 * 
 * Prevents accidental ID confusion at compile-time.
 * Example: Can't pass customerId where productId is expected.
 */

declare const brand: unique symbol;

/**
 * Brand a primitive type with a unique identifier
 */
export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

/**
 * Branded ID types for domain entities
 */
export type CustomerId = Brand<string, 'CustomerId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type UserId = Brand<string, 'UserId'>;
export type QuoteId = Brand<string, 'QuoteId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type InvoiceId = Brand<string, 'InvoiceId'>;

/**
 * Type-safe constructors to create branded IDs
 * Use these when converting from raw strings (e.g., from database or API)
 */
export function toCustomerId(id: string): CustomerId {
    return id as CustomerId;
}

export function toLocationId(id: string): LocationId {
    return id as LocationId;
}

export function toProductId(id: string): ProductId {
    return id as ProductId;
}

export function toUserId(id: string): UserId {
    return id as UserId;
}

export function toQuoteId(id: string): QuoteId {
    return id as QuoteId;
}

export function toOrderId(id: string): OrderId {
    return id as OrderId;
}

export function toInvoiceId(id: string): InvoiceId {
    return id as InvoiceId;
}

/**
 * Extract raw string from branded type
 * Use when you need the underlying primitive (e.g., for database queries)
 */
export function fromBrandedId<T extends string>(id: Brand<string, T>): string {
    return id as string;
}

/**
 * Example Usage:
 * 
 * ```typescript
 * function createOrder(customerId: CustomerId, locationId: LocationId) {
 *     // Type-safe - can't accidentally swap these
 *     await prisma.order.create({
 *         data: {
 *             customerId: fromBrandedId(customerId),
 *             locationId: fromBrandedId(locationId)
 *         }
 *     });
 * }
 * 
 * const customerId = toCustomerId("cust-123");
 * const locationId = toLocationId("loc-456");
 * 
 * createOrder(customerId, locationId);  // ✅ Works
 * createOrder(locationId, customerId);  // ❌ Type error!
 * ```
 */
