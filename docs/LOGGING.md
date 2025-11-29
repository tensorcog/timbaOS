# Logging Guide

This guide covers the production-ready logging system in timbaOS.

## Overview

timbaOS uses a structured logging system that:
- Outputs JSON in production for log aggregation services
- Pretty-prints colorized logs in development for readability
- Supports contextual logging with metadata
- Includes performance tracking utilities
- Integrates seamlessly with error tracking services

## Quick Start

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.warn('Rate limit approaching', { remaining: 10, limit: 100 });
logger.error('Payment failed', { error, orderId: 'xyz-789' });
```

## Log Levels

Logs are output at different severity levels:

| Level | Priority | Use Case | Output in Prod? |
|-------|----------|----------|-----------------|
| DEBUG | 0 | Detailed debugging information | No (by default) |
| INFO  | 1 | General informational messages | Yes |
| WARN  | 2 | Warning messages | Yes |
| ERROR | 3 | Error messages | Yes |

**Default levels:**
- Development: `DEBUG` and above
- Production: `INFO` and above

## Basic Usage

### Information Logging

```typescript
logger.info('Order created', {
    orderId: 'order-123',
    customerId: 'customer-456',
    total: 299.99
});
```

### Error Logging

```typescript
try {
    await processPayment(order);
} catch (error) {
    logger.error('Payment processing failed', {
        error,
        orderId: order.id,
        amount: order.total
    });
    throw error;
}
```

### Warning Logging

```typescript
if (inventory.stockLevel < inventory.reorderPoint) {
    logger.warn('Stock level below reorder point', {
        productId: product.id,
        stockLevel: inventory.stockLevel,
        reorderPoint: inventory.reorderPoint
    });
}
```

### Debug Logging

```typescript
logger.debug('Cache lookup', {
    key: cacheKey,
    hit: !!cachedValue
});
```

## Contextual Logging

Create a logger with persistent context:

```typescript
const requestLogger = logger.withContext({
    requestId: 'abc-123',
    userId: session.userId
});

requestLogger.info('Request started');
// ... processing ...
requestLogger.info('Request completed', { duration: 150 });

// Both logs will include requestId and userId
```

## API Route Logging

Use the `requestLogger` helper for consistent API logging:

```typescript
import { requestLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const log = requestLogger('POST', '/api/orders', {
        userId: session.userId
    });

    log.info('Creating order');

    try {
        const order = await createOrder(data);
        log.info('Order created successfully', {
            orderId: order.id,
            statusCode: 201
        });
        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        log.error('Order creation failed', {
            error,
            statusCode: 500
        });
        throw error;
    }
}
```

## Performance Tracking

Track operation duration:

```typescript
import { performanceLogger } from '@/lib/logger';

async function complexDatabaseQuery() {
    const perf = performanceLogger('Complex database query', {
        table: 'orders',
        filters: 'last_30_days'
    });

    const results = await prisma.order.findMany({
        where: { /* ... */ }
    });

    perf.end(); // Logs: "Complex database query completed" with duration

    return results;
}
```

## Output Formats

### Development (Pretty Print)

```
[INFO ] 14:32:15 - User logged in
  userId: user-123
  email: john@example.com
  ip: 192.168.1.1

[ERROR] 14:35:42 - Payment failed
  error: Insufficient funds
  orderId: order-456
  amount: 299.99
  stack: Error: Insufficient funds
    at processPayment (...)
    at POST (...)
```

### Production (JSON)

```json
{
  "timestamp": "2025-11-28T14:32:15.123Z",
  "level": "info",
  "message": "User logged in",
  "metadata": {
    "userId": "user-123",
    "email": "john@example.com",
    "ip": "192.168.1.1"
  },
  "env": "production",
  "pid": 1234
}
```

## Integration with Log Aggregation Services

### Datadog

```typescript
// In production, logs are JSON and can be shipped to Datadog
// Configure your log shipper (e.g., Vector, Fluentd) to:
// 1. Read from stdout/stderr
// 2. Parse JSON format
// 3. Ship to Datadog with proper tags

// Add Datadog-specific metadata:
logger.info('User action', {
    userId: '123',
    'dd.trace_id': traceId,  // For trace correlation
    'dd.span_id': spanId
});
```

### CloudWatch

```bash
# Ship JSON logs to CloudWatch using awslogs driver
docker run --log-driver=awslogs \
  --log-opt awslogs-group=/timbaos/production \
  --log-opt awslogs-stream=api \
  your-app
```

### Elasticsearch (ELK Stack)

```typescript
// JSON format works perfectly with Logstash/Filebeat
// Example Logstash filter:
{
  filter {
    json {
      source => "message"
    }
    date {
      match => ["timestamp", "ISO8601"]
    }
  }
}
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug('Cache hit', { key: 'user:123' });  // Development only
logger.info('Order completed', { orderId: '456' });  // Important event
logger.warn('Retry attempt', { attempt: 2 });  // Recoverable issue
logger.error('Database unavailable', { error });  // Critical error

// ❌ Bad
logger.info('Loop iteration', { i: 42 });  // Too verbose
logger.error('User not found', { userId });  // Not an error, use 404
```

### 2. Include Relevant Metadata

```typescript
// ✅ Good
logger.info('Payment processed', {
    orderId: order.id,
    amount: order.total,
    currency: order.currency,
    paymentMethod: payment.method,
    duration: 234
});

// ❌ Bad
logger.info('Payment processed');  // No context
```

### 3. Always Log Errors with Stack Traces

```typescript
// ✅ Good
try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed', {
        error,  // Includes stack trace
        operationId: '123'
    });
}

// ❌ Bad
catch (error) {
    logger.error('Operation failed', {
        message: error.message  // Loses stack trace
    });
}
```

### 4. Use Contextual Loggers

```typescript
// ✅ Good
const userLogger = logger.withContext({ userId: user.id });
userLogger.info('Profile updated');
userLogger.info('Settings changed');
// Both include userId automatically

// ❌ Bad
logger.info('Profile updated', { userId: user.id });
logger.info('Settings changed', { userId: user.id });
// Repetitive
```

### 5. Avoid Logging Sensitive Data

```typescript
// ✅ Good
logger.info('User authenticated', {
    userId: user.id,
    email: maskEmail(user.email)  // j***@example.com
});

// ❌ Bad - NEVER DO THIS
logger.info('User authenticated', {
    password: user.password,  // ❌ Security violation
    creditCard: payment.card,  // ❌ PCI compliance violation
    ssn: user.ssn  // ❌ Privacy violation
});
```

### 6. Log Request/Response Boundaries

```typescript
export async function POST(request: NextRequest) {
    const log = requestLogger('POST', '/api/orders');

    log.info('Request received');  // Entry point

    try {
        const result = await processOrder(data);
        log.info('Request completed', { statusCode: 200 });  // Success exit
        return NextResponse.json(result);
    } catch (error) {
        log.error('Request failed', { error, statusCode: 500 });  // Error exit
        throw error;
    }
}
```

## Environment Variables

Control logging behavior with environment variables:

```bash
# .env
NODE_ENV=production        # Enables JSON logging, INFO level
# NODE_ENV=development     # Enables pretty logging, DEBUG level
```

## Testing with Logs

Suppress logs during tests:

```typescript
// jest.setup.js
global.console = {
    ...console,
    log: jest.fn(),    // Suppress info/debug
    error: jest.fn(),  // Suppress errors/warnings
};
```

Or test log output:

```typescript
import { logger } from '@/lib/logger';

test('logs error when operation fails', () => {
    const spy = jest.spyOn(console, 'error');

    logger.error('Test error', { code: 'TEST' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
});
```

## Migration from console.log

Replace existing logging:

```typescript
// Before
console.log('User created:', userId);
console.error('Error:', error);

// After
logger.info('User created', { userId });
logger.error('Error occurred', { error });
```

## Troubleshooting

### Logs not appearing

Check your log level configuration:
```typescript
// Force DEBUG level
import { Logger, LogLevel } from '@/lib/logger';
const logger = new Logger({ minLevel: LogLevel.DEBUG });
```

### JSON not parsing in production

Ensure you're not mixing pretty print with JSON:
```typescript
// Force JSON output
const logger = new Logger({ prettyPrint: false });
```

### Performance concerns

Logging is synchronous. For high-throughput scenarios:
1. Use appropriate log levels (avoid DEBUG in production)
2. Limit metadata size
3. Consider async log shipping (ship to external service asynchronously)

## Future Enhancements

Planned improvements:
- [ ] Async log writing to prevent blocking
- [ ] Sampling for high-volume logs
- [ ] Built-in integrations for Sentry, Datadog APM
- [ ] Structured error tracking with breadcrumbs
- [ ] Log rotation for file-based logging

## Related Documentation

- [Error Handler](../src/lib/error-handler.ts) - Error classification and handling
- [API Documentation](./API.md) - API endpoint details
- [Security Policy](../SECURITY.md) - Security logging requirements
