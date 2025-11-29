import {
    posCheckoutItemSchema,
    posPaymentSchema,
    posCheckoutSchema,
} from '../pos';

describe('POS Validation Schemas', () => {
    describe('posCheckoutItemSchema', () => {
        it('should validate a valid item', () => {
            const validItem = {
                productId: 'prod-123',
                quantity: 5,
                price: 19.99,
                discount: 2.00,
            };

            const result = posCheckoutItemSchema.safeParse(validItem);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validItem);
            }
        });

        it('should validate item without discount (defaults to 0)', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.discount).toBe(0);
            }
        });

        it('should reject empty product ID', () => {
            const item = {
                productId: '',
                quantity: 1,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Product ID is required');
            }
        });

        it('should reject missing product ID', () => {
            const item = {
                quantity: 1,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
        });

        it('should reject zero quantity', () => {
            const item = {
                productId: 'prod-123',
                quantity: 0,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Quantity must be positive');
            }
        });

        it('should reject negative quantity', () => {
            const item = {
                productId: 'prod-123',
                quantity: -5,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
        });

        it('should reject decimal quantity', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1.5,
                price: 10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
        });

        it('should reject negative price', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                price: -10.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Price must be non-negative');
            }
        });

        it('should allow zero price', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                price: 0,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(true);
        });

        it('should reject negative discount', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                price: 10.00,
                discount: -1.00,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Discount must be non-negative');
            }
        });

        it('should allow zero discount', () => {
            const item = {
                productId: 'prod-123',
                quantity: 1,
                price: 10.00,
                discount: 0,
            };

            const result = posCheckoutItemSchema.safeParse(item);
            expect(result.success).toBe(true);
        });
    });

    describe('posPaymentSchema', () => {
        const validMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'ACCOUNT', 'WIRE_TRANSFER'];

        validMethods.forEach(method => {
            it(`should validate ${method} payment method`, () => {
                const payment = {
                    method,
                    amount: 100.00,
                };

                const result = posPaymentSchema.safeParse(payment);
                expect(result.success).toBe(true);
            });
        });

        it('should reject invalid payment method', () => {
            const payment = {
                method: 'BITCOIN',
                amount: 100.00,
            };

            const result = posPaymentSchema.safeParse(payment);
            expect(result.success).toBe(false);
        });

        it('should reject zero payment amount', () => {
            const payment = {
                method: 'CASH',
                amount: 0,
            };

            const result = posPaymentSchema.safeParse(payment);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Payment amount must be positive');
            }
        });

        it('should reject negative payment amount', () => {
            const payment = {
                method: 'CASH',
                amount: -50.00,
            };

            const result = posPaymentSchema.safeParse(payment);
            expect(result.success).toBe(false);
        });

        it('should validate decimal payment amounts', () => {
            const payment = {
                method: 'CASH',
                amount: 123.45,
            };

            const result = posPaymentSchema.safeParse(payment);
            expect(result.success).toBe(true);
        });
    });

    describe('posCheckoutSchema', () => {
        const validCheckout = {
            customerId: 'customer-123',
            locationId: 'location-456',
            items: [
                {
                    productId: 'prod-1',
                    quantity: 2,
                    price: 15.99,
                    discount: 0,
                },
            ],
            payments: [
                {
                    method: 'CREDIT_CARD',
                    amount: 31.98,
                },
            ],
        };

        it('should validate a complete valid checkout', () => {
            const result = posCheckoutSchema.safeParse(validCheckout);
            expect(result.success).toBe(true);
        });

        it('should validate checkout with multiple items', () => {
            const checkout = {
                ...validCheckout,
                items: [
                    { productId: 'prod-1', quantity: 2, price: 10.00 },
                    { productId: 'prod-2', quantity: 1, price: 20.00 },
                    { productId: 'prod-3', quantity: 3, price: 5.00 },
                ],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(true);
        });

        it('should validate checkout with multiple payments (split payment)', () => {
            const checkout = {
                ...validCheckout,
                payments: [
                    { method: 'CASH', amount: 20.00 },
                    { method: 'CREDIT_CARD', amount: 11.98 },
                ],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(true);
        });

        it('should reject empty customer ID', () => {
            const checkout = {
                ...validCheckout,
                customerId: '',
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Customer ID is required');
            }
        });

        it('should reject empty location ID', () => {
            const checkout = {
                ...validCheckout,
                locationId: '',
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Location ID is required');
            }
        });

        it('should reject empty items array', () => {
            const checkout = {
                ...validCheckout,
                items: [],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('At least one item is required');
            }
        });

        it('should reject empty payments array', () => {
            const checkout = {
                ...validCheckout,
                payments: [],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('At least one payment is required');
            }
        });

        it('should reject invalid items in array', () => {
            const checkout = {
                ...validCheckout,
                items: [
                    { productId: 'prod-1', quantity: -1, price: 10.00 },
                ],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
        });

        it('should reject invalid payments in array', () => {
            const checkout = {
                ...validCheckout,
                payments: [
                    { method: 'INVALID_METHOD', amount: 100.00 },
                ],
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
        });

        it('should reject missing required fields', () => {
            const checkout = {
                customerId: 'customer-123',
                // Missing locationId, items, payments
            };

            const result = posCheckoutSchema.safeParse(checkout);
            expect(result.success).toBe(false);
        });
    });
});
