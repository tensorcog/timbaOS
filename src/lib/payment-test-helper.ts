import { paymentEmulator, PaymentRequest } from './payment-emulator';

/**
 * Test Helper for Payment Emulator
 * Provides easy-to-use functions for testing payment scenarios
 */

export class PaymentTestHelper {
    /**
     * Create a successful payment
     */
    static async createSuccessfulPayment(amount: number, method: PaymentRequest['paymentMethod'] = 'CREDIT_CARD') {
        return await paymentEmulator.processPayment({
            amount,
            paymentMethod: method,
            cardNumber: '4111111111111111', // Always approve
            referenceNumber: `TEST-${Date.now()}`,
            accountNumber: method === 'ACH' ? '123456789' : undefined,
            routingNumber: method === 'ACH' ? '021000021' : undefined,
        });
    }

    /**
     * Create a declined payment
     */
    static async createDeclinedPayment(amount: number) {
        return await paymentEmulator.processPayment({
            amount,
            paymentMethod: 'CREDIT_CARD',
            cardNumber: '4000000000000002', // Always decline
        });
    }

    /**
     * Create a pending payment (e.g., ACH)
     */
    static async createPendingPayment(amount: number) {
        return await paymentEmulator.processPayment({
            amount,
            paymentMethod: 'ACH',
            accountNumber: '123456789',
            routingNumber: '021000021',
        });
    }

    /**
     * Create a cash payment
     */
    static async createCashPayment(amount: number) {
        return await paymentEmulator.processPayment({
            amount,
            paymentMethod: 'CASH',
            referenceNumber: `CASH-${Date.now()}`,
        });
    }

    /**
     * Create a check payment
     */
    static async createCheckPayment(amount: number, checkNumber: string) {
        return await paymentEmulator.processPayment({
            amount,
            paymentMethod: 'CHECK',
            referenceNumber: checkNumber,
        });
    }

    /**
     * Simulate multiple partial payments
     */
    static async createPartialPayments(totalAmount: number, numberOfPayments: number) {
        const paymentAmount = totalAmount / numberOfPayments;
        const payments = [];

        for (let i = 0; i < numberOfPayments; i++) {
            const payment = await this.createSuccessfulPayment(paymentAmount);
            payments.push(payment);
        }

        return payments;
    }

    /**
     * Test all payment methods
     */
    static async testAllPaymentMethods(amount: number) {
        const methods: PaymentRequest['paymentMethod'][] = [
            'CASH',
            'CHECK',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'ACH',
            'WIRE_TRANSFER',
            'OTHER',
        ];

        const results: Record<string, any> = {};

        for (const method of methods) {
            try {
                results[method] = await paymentEmulator.processPayment({
                    amount,
                    paymentMethod: method,
                    cardNumber: method.includes('CARD') ? '4111111111111111' : undefined,
                    referenceNumber: `TEST-${method}-${Date.now()}`,
                    accountNumber: method === 'ACH' ? '123456789' : undefined,
                    routingNumber: method === 'ACH' ? '021000021' : undefined,
                });
            } catch (error: any) {
                results[method] = { error: error.message };
            }
        }

        return results;
    }

    /**
     * Process a refund
     */
    static async processRefund(transactionId: string, amount: number) {
        return await paymentEmulator.processRefund(transactionId, amount);
    }
}

export default PaymentTestHelper;
