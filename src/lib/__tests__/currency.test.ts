import { Currency, currency } from '../currency';
import Decimal from 'decimal.js';

describe('Currency', () => {
    describe('Constructor', () => {
        it('should create currency from number', () => {
            const c = new Currency(10.50);
            expect(c.toString()).toBe('10.50');
        });

        it('should create currency from string', () => {
            const c = new Currency('25.99');
            expect(c.toString()).toBe('25.99');
        });

        it('should create currency from Decimal', () => {
            const decimal = new Decimal('99.99');
            const c = new Currency(decimal);
            expect(c.toString()).toBe('99.99');
        });

        it('should handle zero', () => {
            const c = new Currency(0);
            expect(c.toString()).toBe('0.00');
        });

        it('should handle negative values', () => {
            const c = new Currency(-50.25);
            expect(c.toString()).toBe('-50.25');
        });

        it('should handle very large numbers', () => {
            const c = new Currency('999999999.99');
            expect(c.toString()).toBe('999999999.99');
        });

        it('should handle very small decimals with precision', () => {
            const c = new Currency('0.0000000001');
            // Decimal toString() may use scientific notation for very small numbers
            const decimalStr = c.toDecimal().toString();
            expect(decimalStr === '0.0000000001' || decimalStr === '1e-10').toBe(true);
        });
    });

    describe('Addition', () => {
        it('should add two currency values', () => {
            const c1 = currency(10.50);
            const c2 = currency(5.25);
            const result = c1.add(c2);
            expect(result.toString()).toBe('15.75');
        });

        it('should add currency and number', () => {
            const c = currency(10);
            const result = c.add(5.50);
            expect(result.toString()).toBe('15.50');
        });

        it('should add currency and string', () => {
            const c = currency(100);
            const result = c.add('50.25');
            expect(result.toString()).toBe('150.25');
        });

        it('should handle adding zero', () => {
            const c = currency(10);
            const result = c.add(0);
            expect(result.toString()).toBe('10.00');
        });

        it('should handle adding negative values', () => {
            const c = currency(100);
            const result = c.add(-25);
            expect(result.toString()).toBe('75.00');
        });

        it('should avoid floating-point precision errors', () => {
            const c1 = currency(0.1);
            const c2 = currency(0.2);
            const result = c1.add(c2);
            // In JavaScript: 0.1 + 0.2 = 0.30000000000000004
            // With Currency: should be exactly 0.30
            expect(result.toString()).toBe('0.30');
        });
    });

    describe('Subtraction', () => {
        it('should subtract two currency values', () => {
            const c1 = currency(100);
            const c2 = currency(25.50);
            const result = c1.subtract(c2);
            expect(result.toString()).toBe('74.50');
        });

        it('should subtract number from currency', () => {
            const c = currency(50);
            const result = c.subtract(12.25);
            expect(result.toString()).toBe('37.75');
        });

        it('should handle subtracting to negative', () => {
            const c = currency(10);
            const result = c.subtract(15);
            expect(result.toString()).toBe('-5.00');
        });

        it('should avoid floating-point precision errors', () => {
            const c1 = currency(0.3);
            const c2 = currency(0.1);
            const result = c1.subtract(c2);
            // In JavaScript: 0.3 - 0.1 = 0.19999999999999998
            // With Currency: should be exactly 0.20
            expect(result.toString()).toBe('0.20');
        });
    });

    describe('Multiplication', () => {
        it('should multiply currency by number', () => {
            const c = currency(10.50);
            const result = c.multiply(3);
            expect(result.toString()).toBe('31.50');
        });

        it('should multiply by decimal', () => {
            const c = currency(100);
            const result = c.multiply(0.0825); // Tax rate
            expect(result.toString()).toBe('8.25');
        });

        it('should multiply by another currency', () => {
            const c1 = currency(5);
            const c2 = currency(2.5);
            const result = c1.multiply(c2);
            expect(result.toString()).toBe('12.50');
        });

        it('should handle multiplication by zero', () => {
            const c = currency(100);
            const result = c.multiply(0);
            expect(result.toString()).toBe('0.00');
        });

        it('should avoid floating-point precision errors', () => {
            const c = currency(0.1);
            const result = c.multiply(0.2);
            // In JavaScript: 0.1 * 0.2 = 0.020000000000000004
            // With Currency: should be exactly 0.02
            expect(result.toString()).toBe('0.02');
        });
    });

    describe('Division', () => {
        it('should divide currency by number', () => {
            const c = currency(100);
            const result = c.divide(4);
            expect(result.toString()).toBe('25.00');
        });

        it('should divide by decimal', () => {
            const c = currency(10);
            const result = c.divide(3);
            expect(result.toString()).toBe('3.33');
        });

        it('should divide by another currency', () => {
            const c1 = currency(100);
            const c2 = currency(4);
            const result = c1.divide(c2);
            expect(result.toString()).toBe('25.00');
        });

        it('should avoid floating-point precision errors', () => {
            const c = currency(0.3);
            const result = c.divide(3);
            expect(result.toString()).toBe('0.10');
        });
    });

    describe('Comparison Operations', () => {
        describe('eq (equals)', () => {
            it('should return true for equal values', () => {
                const c1 = currency(10.50);
                const c2 = currency(10.50);
                expect(c1.eq(c2)).toBe(true);
            });

            it('should return false for different values', () => {
                const c1 = currency(10.50);
                const c2 = currency(10.51);
                expect(c1.eq(c2)).toBe(false);
            });

            it('should compare with number', () => {
                const c = currency(10);
                expect(c.eq(10)).toBe(true);
                expect(c.eq(10.01)).toBe(false);
            });
        });

        describe('lt (less than)', () => {
            it('should return true when first is less', () => {
                const c1 = currency(5);
                const c2 = currency(10);
                expect(c1.lt(c2)).toBe(true);
            });

            it('should return false when first is greater', () => {
                const c1 = currency(10);
                const c2 = currency(5);
                expect(c1.lt(c2)).toBe(false);
            });

            it('should return false when equal', () => {
                const c1 = currency(10);
                const c2 = currency(10);
                expect(c1.lt(c2)).toBe(false);
            });
        });

        describe('lte (less than or equal)', () => {
            it('should return true when less', () => {
                expect(currency(5).lte(10)).toBe(true);
            });

            it('should return true when equal', () => {
                expect(currency(10).lte(10)).toBe(true);
            });

            it('should return false when greater', () => {
                expect(currency(15).lte(10)).toBe(false);
            });
        });

        describe('gt (greater than)', () => {
            it('should return true when first is greater', () => {
                expect(currency(10).gt(5)).toBe(true);
            });

            it('should return false when first is less', () => {
                expect(currency(5).gt(10)).toBe(false);
            });

            it('should return false when equal', () => {
                expect(currency(10).gt(10)).toBe(false);
            });
        });

        describe('gte (greater than or equal)', () => {
            it('should return true when greater', () => {
                expect(currency(15).gte(10)).toBe(true);
            });

            it('should return true when equal', () => {
                expect(currency(10).gte(10)).toBe(true);
            });

            it('should return false when less', () => {
                expect(currency(5).gte(10)).toBe(false);
            });
        });
    });

    describe('Conversion Methods', () => {
        describe('toPrismaDecimal', () => {
            it('should return Decimal rounded to 2 places', () => {
                const c = currency(10.12345);
                const decimal = c.toPrismaDecimal();
                expect(decimal).toBeInstanceOf(Decimal);
                expect(decimal.toString()).toBe('10.12');
            });

            it('should round half up', () => {
                const c = currency(10.125);
                expect(c.toPrismaDecimal().toString()).toBe('10.13');
            });

            it('should handle whole numbers', () => {
                const c = currency(100);
                // Decimal toString() drops unnecessary trailing zeros
                const result = c.toPrismaDecimal();
                expect(result.toNumber()).toBe(100.00);
            });
        });

        describe('toString', () => {
            it('should return string with 2 decimal places', () => {
                const c = currency(10.5);
                expect(c.toString()).toBe('10.50');
            });

            it('should format whole numbers', () => {
                const c = currency(100);
                expect(c.toString()).toBe('100.00');
            });

            it('should handle negative values', () => {
                const c = currency(-25.5);
                expect(c.toString()).toBe('-25.50');
            });
        });

        describe('toNumber', () => {
            it('should convert to number', () => {
                const c = currency(10.50);
                expect(c.toNumber()).toBe(10.50);
            });

            it('should round to 2 decimal places', () => {
                const c = currency(10.12345);
                expect(c.toNumber()).toBe(10.12);
            });
        });

        describe('toDecimalPlaces', () => {
            it('should round to specified decimal places', () => {
                const c = currency(10.12345);
                expect(c.toDecimalPlaces(3).toString()).toBe('10.123');
                expect(c.toDecimalPlaces(1).toString()).toBe('10.1');
                expect(c.toDecimalPlaces(0).toString()).toBe('10');
            });
        });

        describe('toDecimal', () => {
            it('should return raw Decimal with full precision', () => {
                const c = currency(10.123456789);
                const decimal = c.toDecimal();
                expect(decimal).toBeInstanceOf(Decimal);
                // Full precision should be maintained
                expect(decimal.toString()).toContain('10.123456789');
            });
        });
    });

    describe('Real-world Financial Scenarios', () => {
        it('should calculate order total correctly', () => {
            // Item 1: $15.99 x 3 = $47.97
            const item1 = currency(15.99).multiply(3);
            // Item 2: $25.50 x 2 = $51.00
            const item2 = currency(25.50).multiply(2);
            // Subtotal: $98.97
            const subtotal = item1.add(item2);
            expect(subtotal.toString()).toBe('98.97');

            // Tax 8.25%
            const tax = subtotal.multiply(0.0825);
            expect(tax.toString()).toBe('8.17');

            // Total
            const total = subtotal.add(tax);
            expect(total.toString()).toBe('107.14');
        });

        it('should calculate discount correctly', () => {
            const price = currency(100);
            const discount = price.multiply(0.15); // 15% discount
            const finalPrice = price.subtract(discount);
            expect(discount.toString()).toBe('15.00');
            expect(finalPrice.toString()).toBe('85.00');
        });

        it('should handle split payments', () => {
            const total = currency(150.75);
            const payment1 = currency(100);
            const payment2 = currency(50.75);
            const sumPayments = payment1.add(payment2);
            expect(sumPayments.eq(total)).toBe(true);
        });

        it('should calculate tip correctly', () => {
            const billAmount = currency(85.50);
            const tipPercent = 0.18; // 18%
            const tip = billAmount.multiply(tipPercent);
            const total = billAmount.add(tip);
            expect(tip.toString()).toBe('15.39');
            expect(total.toString()).toBe('100.89');
        });

        it('should handle refund calculation', () => {
            const orderTotal = currency(299.99);
            const refundPercent = 0.5; // 50% refund
            const refundAmount = orderTotal.multiply(refundPercent);
            const remaining = orderTotal.subtract(refundAmount);
            expect(refundAmount.toString()).toBe('150.00');
            expect(remaining.toString()).toBe('150.00');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very small values', () => {
            const c = currency(0.01);
            expect(c.toString()).toBe('0.01');
        });

        it('should handle chained operations', () => {
            const result = currency(100)
                .multiply(2)
                .subtract(50)
                .divide(5)
                .add(10);
            expect(result.toString()).toBe('40.00');
        });

        it('should maintain precision through multiple operations', () => {
            // Simulate multiple POS transactions
            let runningTotal = currency(0);
            runningTotal = runningTotal.add(currency(10.99));
            runningTotal = runningTotal.add(currency(5.50));
            runningTotal = runningTotal.add(currency(3.25));
            expect(runningTotal.toString()).toBe('19.74');
        });

        it('should handle negative zero correctly', () => {
            const c1 = currency(5);
            const c2 = currency(5);
            const result = c1.subtract(c2);
            expect(result.toString()).toBe('0.00');
            expect(result.eq(0)).toBe(true);
        });
    });

    describe('currency helper function', () => {
        it('should create Currency instance', () => {
            const c = currency(10);
            expect(c).toBeInstanceOf(Currency);
            expect(c.toString()).toBe('10.00');
        });
    });
});
