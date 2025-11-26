import Decimal from 'decimal.js';

// Configure Decimal for currency
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class Currency {
    private amount: Decimal;

    constructor(amount: number | string | Decimal) {
        this.amount = new Decimal(amount);
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

    // Returns the value as a number rounded to 2 decimal places
    toNumber(): number {
        return this.amount.toDecimalPlaces(2).toNumber();
    }

    // Returns the value as a string rounded to 2 decimal places
    toString(): string {
        return this.amount.toDecimalPlaces(2).toFixed(2);
    }

    // Returns the raw Decimal object
    toDecimal(): Decimal {
        return this.amount;
    }
}

export const currency = (amount: number | string | Decimal) => new Currency(amount);
