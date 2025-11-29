# Payment Emulator

A testing utility for simulating payment gateway responses without requiring real payment infrastructure.

## Features

- ✅ Multiple payment methods (Cash, Check, Credit Card, ACH, Wire Transfer)
- ✅ Test card numbers for different scenarios
- ✅ Configurable failure rates
- ✅ Processing delays simulation
- ✅ Transaction ID generation
- ✅ Refund support
- ✅ Status checking

## Usage

### Basic Payment Processing

```typescript
import { paymentEmulator } from '@/lib/payment-emulator';

const response = await paymentEmulator.processPayment({
  amount: 100.00,
  paymentMethod: 'CREDIT_CARD',
  cardNumber: '4111111111111111', // Test card - always approves
});

console.log(response.success); // true
console.log(response.transactionId); // TEST-1234567890-ABC123
```

### Test Helper Usage

```typescript
import PaymentTestHelper from '@/lib/payment-test-helper';

// Successful payment
const payment = await PaymentTestHelper.createSuccessfulPayment(250.00);

// Declined payment
const declined = await PaymentTestHelper.createDeclinedPayment(100.00);

// Cash payment
const cash = await PaymentTestHelper.createCashPayment(50.00);

// Check payment
const check = await PaymentTestHelper.createCheckPayment(150.00, 'CHK-1001');

// Partial payments
const partials = await PaymentTestHelper.createPartialPayments(1000.00, 4);

// Test all methods
const results = await PaymentTestHelper.testAllPaymentMethods(100.00);
```

## Test Card Numbers

| Card Number | Scenario |
|-------------|----------|
| `4111111111111111` | Always approved |
| `4000000000000002` | Always declined |
| `4000000000000127` | Pending (requires auth) |
| `4000000000000341` | Processing error |

## Payment Methods

- `CASH` - Cash payment (always approved)
- `CHECK` - Check payment (requires reference number)
- `CREDIT_CARD` - Credit card payment
- `DEBIT_CARD` - Debit card payment  
- `ACH` - ACH bank transfer (goes to pending)
- `WIRE_TRANSFER` - Wire transfer (always approved)
- `OTHER` - Other payment method

## Configuration

```typescript
import { createPaymentEmulator } from '@/lib/payment-emulator';

// Emulator with 10% failure rate and 500ms delay
const emulator = createPaymentEmulator('TEST', 0.1, 500);

const response = await emulator.processPayment({
  amount: 100,
  paymentMethod: 'CREDIT_CARD',
});
```

## Response Structure

```typescript
{
  success: boolean;
  transactionId: string;
  amount: number;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR';
  message: string;
  timestamp: Date;
  gatewayResponse: {
    gateway: 'TEST' | 'STRIPE' | 'SQUARE' | 'AUTHORIZE_NET';
    code: string;
    description: string;
  };
}
```

## Testing Invoice Payments

```typescript
import PaymentTestHelper from '@/lib/payment-test-helper';

// In your test
test('Record invoice payment', async () => {
  // Create invoice
  const invoice = await createTestInvoice(100.00);
  
  // Process payment through emulator
  const paymentResult = await PaymentTestHelper.createSuccessfulPayment(100.00);
  
  // Record payment in system
  const response = await fetch('/api/invoice-payments', {
    method: 'POST',
    body: JSON.stringify({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount: paymentResult.amount,
      paymentMethod: 'CREDIT_CARD',
      referenceNumber: paymentResult.transactionId,
    }),
  });
  
  expect(response.ok).toBeTruthy();
});
```

## Features for Testing

### Refunds

```typescript
const refund = await paymentEmulator.processRefund('TEST-123-ABC', 50.00);
```

### Status Checking

```typescript
const status = await paymentEmulator.checkPaymentStatus('TEST-123-ABC');
```

### Multiple Partial Payments

```typescript
const payments = await PaymentTestHelper.createPartialPayments(1000.00, 5);
// Creates 5 payments of $200 each
```

## Integration with Invoice Tests

The payment emulator is designed to work seamlessly with the invoice payment tests:

```typescript
test('Full payment marks invoice as paid', async () => {
  const invoice = await createInvoice(500.00);
  
  // Use emulator to get a valid transaction ID
  const payment = await PaymentTestHelper.createSuccessfulPayment(500.00);
  
  // Record in system
  await recordInvoicePayment({
    invoiceId: invoice.id,
    amount: 500.00,
    referenceNumber: payment.transactionId,
  });
  
  // Verify
  const updated = await getInvoice(invoice.id);
  expect(updated.status).toBe('PAID');
});
```
