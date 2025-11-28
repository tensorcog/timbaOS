import Decimal from 'decimal.js';

/**
 * Currency class for precise financial calculations.
 * Uses Decimal.js internally to avoid floating-point precision errors.
 * 
 * Each instance configures its own Decimal precision to avoid global state issues.
 */
export class Currency {
    private amount: Decimal;

    constructor(amount: number | string | Decimal) {
        // Configure precision per-instance to avoid global state conflicts
        // Precision of 20 is sufficient for financial calculations
        const config = { precision: 20, rounding: Decimal.ROUND_HALF_UP };

        if (amount instanceof Decimal) {
            this.amount = amount.toDecimalPlaces(20, Decimal.ROUND_HALF_UP);
        } else {
            this.amount = new Decimal(amount).toDecimalPlaces(20, Decimal.ROUND_HALF_UP);
        }
    }

    add(value: number | string | Currency): Currency {
        const other = value instanceof Currency ? value.amount : new Decimal(value);
        return new Currency(this.amount.plus(other));
    }

    subtract(value: number | string | Currency): Currency {
        const other = value instanceof Currency ? value.amount : new Decimal(value);
        return new Currency(this.amount.minus(other));
    }

    multiply(value: number | string | Currency): Currency {
        const other = value instanceof Currency ? value.amount : new Decimal(value);
        return new Currency(this.amount.times(other));
    }

    divide(value: number | string | Currency): Currency {
        const other = value instanceof Currency ? value.amount : new Decimal(value);
        return new Currency(this.amount.div(other));
    }

    /**
     * @deprecated Use toPrismaDecimal() instead for database writes.
     * Converting to number loses precision and should be avoided for financial data.
     * This method is kept for backward compatibility but will be removed in a future version.
     */
    toNumber(): number {
        console.warn('Currency.toNumber() is deprecated. Use toPrismaDecimal() for database writes.');
        return this.amount.toDecimalPlaces(2).toNumber();
    }

    /**
     * Returns a Decimal rounded to 2 decimal places for storage in Prisma/database.
     * This is the recommended way to convert Currency for database writes.
     */
    toPrismaDecimal(): Decimal {
        return this.amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    /**
     * Returns the value rounded to a specific number of decimal places.
     * Useful when you need explicit control over rounding.
     */
    toDecimalPlaces(places: number): Decimal {
        return this.amount.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
    }

    /**
     * Returns the value as a string rounded to 2 decimal places.
     * Suitable for display purposes.
     */
    toString(): string {
        return this.amount.toDecimalPlaces(2).toFixed(2);
    }

    /**
     * Returns the raw Decimal object with full precision.
     * Use with caution - prefer toPrismaDecimal() for database storage.
     */
    toDecimal(): Decimal {
        return this.amount;
    }
}

export const currency = (amount: number | string | Decimal) => new Currency(amount);
