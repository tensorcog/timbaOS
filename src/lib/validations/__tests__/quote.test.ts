import {
    quoteItemSchema,
    createQuoteSchema,
    updateQuoteSchema,
} from '../quote';

describe('Quote Validation Schemas', () => {
    describe('quoteItemSchema', () => {
        it('should validate a valid quote item', () => {
            const validItem = {
                productId: 'prod-123',
                quantity: 10,
                unitPrice: 25.50,
                discount: 2.50,
            };

            const result = quoteItemSchema.safeParse(validItem);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validItem);
            }
        });

        it('should default discount to 0 when not provided', () => {
            const item = {
                productId: 'prod-123',
                quantity: 5,
                unitPrice: 100.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.discount).toBe(0);
            }
        });

        it('should reject empty product ID', () => {
            const item = {
                productId: '',
                quantity: 1,
                unitPrice: 10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Product ID is required');
            }
        });

        it('should reject quantity less than 1', () => {
            const item = {
                productId: 'prod-123',
                quantity: 0,
                unitPrice: 10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Quantity must be at least 1');
            }
        });

        it('should reject negative quantity', () => {
            const item = {
                productId: 'prod-123',
                quantity: -5,
                unitPrice: 10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
        });

        it('should reject decimal quantity', () => {
            const item = {
                productId: 'prod-123',
                quantity: 2.5,
                unitPrice: 10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
        });

        it('should reject negative unit price', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                unitPrice: -10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Unit price must be non-negative');
            }
        });

        it('should allow zero unit price (free items)', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                unitPrice: 0,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(true);
        });

        it('should reject negative discount', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                unitPrice: 100.00,
                discount: -10.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Discount must be non-negative');
            }
        });

        it('should validate large quantities (bulk orders)', () => {
            const item = {
                productId: 'prod-123',
                quantity: 10000,
                unitPrice: 5.00,
            };

            const result = quoteItemSchema.safeParse(item);
            expect(result.success).toBe(true);
        });
    });

    describe('createQuoteSchema', () => {
        const validQuote = {
            customerId: 'customer-123',
            locationId: 'location-456',
            items: [
                {
                    productId: 'prod-1',
                    quantity: 100,
                    unitPrice: 50.00,
                    discount: 5.00,
                },
            ],
        };

        it('should validate a complete valid quote', () => {
            const result = createQuoteSchema.safeParse(validQuote);
            expect(result.success).toBe(true);
        });

        it('should default validityDays to 30 when not provided', () => {
            const result = createQuoteSchema.safeParse(validQuote);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.validityDays).toBe(30);
            }
        });

        it('should validate quote with custom validity days', () => {
            const quote = {
                ...validQuote,
                validityDays: 60,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.validityDays).toBe(60);
            }
        });

        it('should validate quote with optional delivery address', () => {
            const quote = {
                ...validQuote,
                deliveryAddress: '123 Main St, City, State 12345',
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.deliveryAddress).toBeDefined();
            }
        });

        it('should validate quote with optional notes', () => {
            const quote = {
                ...validQuote,
                notes: 'Volume discount applied. Payment terms: Net 30.',
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.notes).toBeDefined();
            }
        });

        it('should validate quote with multiple items', () => {
            const quote = {
                ...validQuote,
                items: [
                    { productId: 'prod-1', quantity: 50, unitPrice: 10.00 },
                    { productId: 'prod-2', quantity: 100, unitPrice: 5.00 },
                    { productId: 'prod-3', quantity: 25, unitPrice: 20.00 },
                ],
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.items).toHaveLength(3);
            }
        });

        it('should reject empty customer ID', () => {
            const quote = {
                ...validQuote,
                customerId: '',
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Customer ID is required');
            }
        });

        it('should reject empty location ID', () => {
            const quote = {
                ...validQuote,
                locationId: '',
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Location ID is required');
            }
        });

        it('should reject empty items array', () => {
            const quote = {
                ...validQuote,
                items: [],
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('At least one item is required');
            }
        });

        it('should reject validityDays less than 1', () => {
            const quote = {
                ...validQuote,
                validityDays: 0,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
        });

        it('should reject validityDays greater than 365', () => {
            const quote = {
                ...validQuote,
                validityDays: 400,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
        });

        it('should accept validityDays at boundary (1 day)', () => {
            const quote = {
                ...validQuote,
                validityDays: 1,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
        });

        it('should accept validityDays at boundary (365 days)', () => {
            const quote = {
                ...validQuote,
                validityDays: 365,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(true);
        });

        it('should reject decimal validityDays', () => {
            const quote = {
                ...validQuote,
                validityDays: 30.5,
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
        });

        it('should reject invalid items in array', () => {
            const quote = {
                ...validQuote,
                items: [
                    { productId: '', quantity: 1, unitPrice: 10.00 },
                ],
            };

            const result = createQuoteSchema.safeParse(quote);
            expect(result.success).toBe(false);
        });
    });

    describe('updateQuoteSchema', () => {
        const validUpdate = {
            items: [
                {
                    productId: 'prod-1',
                    quantity: 50,
                    unitPrice: 25.00,
                },
            ],
        };

        it('should validate a valid quote update', () => {
            const result = updateQuoteSchema.safeParse(validUpdate);
            expect(result.success).toBe(true);
        });

        it('should validate update with notes', () => {
            const update = {
                ...validUpdate,
                notes: 'Updated pricing and quantities',
            };

            const result = updateQuoteSchema.safeParse(update);
            expect(result.success).toBe(true);
        });

        it('should validate update with multiple items', () => {
            const update = {
                items: [
                    { productId: 'prod-1', quantity: 10, unitPrice: 15.00 },
                    { productId: 'prod-2', quantity: 20, unitPrice: 25.00 },
                ],
                notes: 'Revised quote',
            };

            const result = updateQuoteSchema.safeParse(update);
            expect(result.success).toBe(true);
        });

        it('should reject empty items array', () => {
            const update = {
                items: [],
            };

            const result = updateQuoteSchema.safeParse(update);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('At least one item is required');
            }
        });

        it('should reject invalid items', () => {
            const update = {
                items: [
                    { productId: 'prod-1', quantity: -5, unitPrice: 10.00 },
                ],
            };

            const result = updateQuoteSchema.safeParse(update);
            expect(result.success).toBe(false);
        });

        it('should accept update without notes', () => {
            const update = {
                items: [
                    { productId: 'prod-1', quantity: 10, unitPrice: 15.00 },
                ],
            };

            const result = updateQuoteSchema.safeParse(update);
            expect(result.success).toBe(true);
        });
    });
});
