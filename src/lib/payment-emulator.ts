/**
 * Payment Emulator for Testing
 * Simulates payment gateway responses for testing invoice payment flows
 */

export type PaymentGateway = 'STRIPE' | 'SQUARE' | 'AUTHORIZE_NET' | 'TEST';

export interface PaymentRequest {
    amount: number;
    paymentMethod: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ACH' | 'WIRE_TRANSFER' | 'OTHER';
    referenceNumber?: string;
    cardNumber?: string;
    cvv?: string;
    expiryMonth?: number;
    expiryYear?: number;
    accountNumber?: string;
    routingNumber?: string;
}

export interface PaymentResponse {
    success: boolean;
    transactionId: string;
    amount: number;
    status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR';
    message: string;
    timestamp: Date;
    gatewayResponse?: any;
}

export class PaymentEmulator {
    private gateway: PaymentGateway;
    private failureRate: number;
    private processingDelay: number;

    constructor(
        gateway: PaymentGateway = 'TEST',
        failureRate: number = 0,
        processingDelay: number = 0
    ) {
        this.gateway = gateway;
        this.failureRate = failureRate;
        this.processingDelay = processingDelay;
    }

    /**
     * Process a payment through the emulator
     */
    async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
        // Simulate processing delay
        if (this.processingDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        }

        // Validate payment method
        if (!this.validatePaymentMethod(request)) {
            return this.createErrorResponse(request.amount, 'Invalid payment method');
        }

        // Validate amount
        if (request.amount <= 0) {
            return this.createErrorResponse(request.amount, 'Amount must be greater than zero');
        }

        // Simulate random failures based on failure rate
        if (Math.random() < this.failureRate) {
            return this.createDeclinedResponse(request.amount, 'Random failure (test mode)');
        }

        // Process based on payment method
        switch (request.paymentMethod) {
            case 'CREDIT_CARD':
            case 'DEBIT_CARD':
                return this.processCa rdPayment(request);

            case 'ACH':
                return this.processACHPayment(request);

            case 'CHECK':
                return this.processCheckPayment(request);

            case 'CASH':
            case 'WIRE_TRANSFER':
            case 'OTHER':
                return this.processDirectPayment(request);

            default:
                return this.createErrorResponse(request.amount, 'Unsupported payment method');
        }
    }

    /**
     * Process credit/debit card payment
     */
    private processCardPayment(request: PaymentRequest): PaymentResponse {
        // Test card numbers for different scenarios
        const testCards: Record<string, string> = {
            '4111111111111111': 'APPROVED',      // Always approve
            '4000000000000002': 'DECLINED',      // Always decline
            '4000000000000127': 'PENDING',       // Requires authentication
            '4000000000000341': 'ERROR',         // Processing error
        };

        const cardStatus = testCards[request.cardNumber || ''];

        if (cardStatus === 'DECLINED') {
            return this.createDeclinedResponse(request.amount, 'Card declined');
        }

        if (cardStatus === 'PENDING') {
            return this.createPendingResponse(request.amount, 'Requires authentication');
        }

        if (cardStatus === 'ERROR') {
            return this.createErrorResponse(request.amount, 'Processing error');
        }

        // Default: approve the payment
        return this.createApprovedResponse(request.amount, 'Card payment approved');
    }

    /**
     * Process ACH payment
     */
    private processACHPayment(request: PaymentRequest): PaymentResponse {
        if (!request.accountNumber || !request.routingNumber) {
            return this.createErrorResponse(request.amount, 'Missing account or routing number');
        }

        // ACH payments typically go to pending first
        return this.createPendingResponse(request.amount, 'ACH transfer initiated');
    }

    /**
     * Process check payment
     */
    private processCheckPayment(request: PaymentRequest): PaymentResponse {
        if (!request.referenceNumber) {
            return this.createErrorResponse(request.amount, 'Check number required');
        }

        return this.createApprovedResponse(request.amount, `Check #${request.referenceNumber} received`);
    }

    /**
     * Process direct payment (cash, wire, etc)
     */
    private processDirectPayment(request: PaymentRequest): PaymentResponse {
        return this.createApprovedResponse(request.amount, `${request.paymentMethod} payment received`);
    }

    /**
     * Validate payment method has required fields
     */
    private validatePaymentMethod(request: PaymentRequest): boolean {
        switch (request.paymentMethod) {
            case 'CREDIT_CARD':
            case 'DEBIT_CARD':
                // In test mode, card details are optional
                return true;

            case 'ACH':
                // In test mode, ACH details are optional
                return true;

            default:
                return true;
        }
    }

    /**
     * Create approved response
     */
    private createApprovedResponse(amount: number, message: string): PaymentResponse {
        return {
            success: true,
            transactionId: this.generateTransactionId(),
            amount,
            status: 'APPROVED',
            message,
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '00',
                description: 'Transaction approved',
            },
        };
    }

    /**
     * Create declined response
     */
    private createDeclinedResponse(amount: number, message: string): PaymentResponse {
        return {
            success: false,
            transactionId: this.generateTransactionId(),
            amount,
            status: 'DECLINED',
            message,
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '05',
                description: 'Transaction declined',
            },
        };
    }

    /**
     * Create pending response
     */
    private createPendingResponse(amount: number, message: string): PaymentResponse {
        return {
            success: true,
            transactionId: this.generateTransactionId(),
            amount,
            status: 'PENDING',
            message,
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '02',
                description: 'Transaction pending',
            },
        };
    }

    /**
     * Create error response
     */
    private createErrorResponse(amount: number, message: string): PaymentResponse {
        return {
            success: false,
            transactionId: this.generateTransactionId(),
            amount,
            status: 'ERROR',
            message,
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '99',
                description: 'Processing error',
            },
        };
    }

    /**
     * Generate a mock transaction ID
     */
    private generateTransactionId(): string {
        const prefix = this.gateway === 'TEST' ? 'TEST' : this.gateway;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Simulate a refund
     */
    async processRefund(transactionId: string, amount: number): Promise<PaymentResponse> {
        if (this.processingDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        }

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            amount,
            status: 'APPROVED',
            message: `Refund processed for transaction ${transactionId}`,
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '00',
                description: 'Refund approved',
                originalTransaction: transactionId,
            },
        };
    }

    /**
     * Check payment status (for async payments like ACH)
     */
    async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
        // Simulate checking status
        return {
            success: true,
            transactionId,
            amount: 0,
            status: 'APPROVED',
            message: 'Payment completed',
            timestamp: new Date(),
            gatewayResponse: {
                gateway: this.gateway,
                code: '00',
                description: 'Status check successful',
            },
        };
    }
}

// Export singleton instance for tests
export const paymentEmulator = new PaymentEmulator('TEST', 0, 0);

// Export configured instances
export const createPaymentEmulator = (
    gateway: PaymentGateway = 'TEST',
    failureRate: number = 0,
    processingDelay: number = 0
) => new PaymentEmulator(gateway, failureRate, processingDelay);
