# timbaOS API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All API endpoints (except auth endpoints) require authentication via NextAuth session cookie.

### Headers
```
Content-Type: application/json
Cookie: next-auth.session-token=<session-token>
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 60 seconds |
| Standard API | 100 requests | 60 seconds |

Rate limit headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (ISO 8601)
- `Retry-After`: Seconds to wait (when rate limited)

---

## Authentication Endpoints

### POST /api/auth/forgot-password
Request password reset email.

**Rate Limited**: 5 req/min

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200):
```json
{
  "message": "If an account exists with that email, you will receive a password reset link shortly."
}
```

### POST /api/auth/reset-password
Reset password using token from email.

**Rate Limited**: 5 req/min

**Request Body**:
```json
{
  "token": "hex-token-from-email",
  "password": "newpassword123"
}
```

**Success Response** (200):
```json
{
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Error Responses**:
- `400`: Invalid token, password too short, or token expired
- `429`: Too many requests

---

## POS Endpoints

### POST /api/pos/checkout
Process point-of-sale transaction.

**Required Role**: SALES, MANAGER, LOCATION_ADMIN, SUPER_ADMIN

**Request Body**:
```json
{
  "customerId": "customer-uuid",
  "locationId": "location-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "price": 15.99,
      "discount": 0
    }
  ],
  "payments": [
    {
      "method": "CREDIT_CARD",
      "amount": 31.98
    }
  ]
}
```

**Success Response** (200):
```json
{
  "id": "order-uuid",
  "orderNumber": "ORD-00001",
  "totalAmount": 31.98,
  "status": "COMPLETED",
  "paymentStatus": "PAID",
  ...
}
```

**Error Responses**:
- `400`: Validation failed, insufficient inventory
- `401`: Unauthorized
- `403`: Forbidden - Insufficient permissions
- `404`: Location or product not found

---

## Order Endpoints

### GET /api/orders
List orders with optional filtering.

**Query Parameters**:
- `locationId` (optional): Filter by location
- `status` (optional): Filter by status (PENDING, PROCESSING, COMPLETED, CANCELLED)
- `customerId` (optional): Filter by customer

**Success Response** (200):
```json
[
  {
    "id": "order-uuid",
    "orderNumber": "ORD-00001",
    "customerId": "customer-uuid",
    "locationId": "location-uuid",
    "totalAmount": 150.00,
    "status": "PENDING",
    "createdAt": "2025-11-29T00:00:00.000Z",
    ...
  }
]
```

### POST /api/orders
Create new order.

**Request Body**:
```json
{
  "customerId": "customer-uuid",
  "locationId": "location-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 5,
      "price": 25.00,
      "discount": 0
    }
  ],
  "deliveryAddress": "123 Main St",
  "deliveryDate": "2025-12-01T00:00:00.000Z",
  "fulfillmentType": "DELIVERY"
}
```

### GET /api/orders/[id]
Get order by ID.

### PATCH /api/orders/[id]
Update order.

### POST /api/orders/[id]/confirm
Confirm pending order.

### POST /api/orders/[id]/cancel
Cancel order.

---

## Quote Endpoints

### GET /api/quotes
List quotes.

### POST /api/quotes
Create new quote.

**Request Body**:
```json
{
  "customerId": "customer-uuid",
  "locationId": "location-uuid",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 10,
      "unitPrice": 50.00,
      "discount": 5.00
    }
  ],
  "notes": "Bulk order discount applied",
  "terms": "Net 30"
}
```

### POST /api/quotes/[id]/send
Email quote to customer.

### POST /api/quotes/[id]/convert
Convert quote to order.

---

## Invoice Endpoints

### GET /api/invoices
List invoices.

**Query Parameters**:
- `status`: Filter by status (DRAFT, SENT, PAID, OVERDUE)
- `customerId`: Filter by customer
- `locationId`: Filter by location

### POST /api/invoices
Create invoice.

### GET /api/invoices/[id]
Get invoice by ID.

### POST /api/invoices/convert-from-order
Create invoice from order.

**Request Body**:
```json
{
  "orderId": "order-uuid",
  "dueDate": "2025-12-31T00:00:00.000Z",
  "paymentTermDays": 30,
  "notes": "Payment due within 30 days"
}
```

### POST /api/invoice-payments
Record invoice payment.

**Request Body**:
```json
{
  "invoiceId": "invoice-uuid",
  "customerId": "customer-uuid",
  "amount": 150.00,
  "paymentMethod": "CHECK",
  "referenceNumber": "CHK-12345",
  "notes": "Check received"
}
```

---

## Customer Endpoints

### GET /api/customers
List customers.

### POST /api/customers
Create customer.

**Request Body**:
```json
{
  "name": "Acme Construction",
  "email": "contact@acme.com",
  "phone": "555-0100",
  "address": "123 Builder St",
  "customerType": "CONTRACTOR",
  "creditLimit": 50000.00,
  "taxExempt": false,
  "paymentTermDays": 30
}
```

### GET /api/customers/[id]
Get customer by ID.

### PATCH /api/customers/[id]
Update customer.

---

## Product Endpoints

### GET /api/products
List products.

**Query Parameters**:
- `category`: Filter by category
- `isActive`: Filter active products (true/false)
- `search`: Search by name or SKU

### POST /api/products
Create product.

### GET /api/products/[id]
Get product by ID.

### PATCH /api/products/[id]
Update product.

---

## Location Endpoints

### GET /api/locations
List all active locations.

**Success Response** (200):
```json
[
  {
    "id": "location-uuid",
    "code": "MAIN",
    "name": "Main Yard",
    "address": "100 Pine Street",
    "phone": "555-0100",
    "isActive": true,
    "isWarehouse": false,
    "taxRate": 0.0825
  }
]
```

### GET /api/locations/[id]/inventory
Get inventory for specific location.

---

## User Endpoints

### GET /api/users
List users (admin only).

### POST /api/users
Create user (admin only).

### GET /api/users/[id]
Get user by ID.

### PATCH /api/users/[id]
Update user.

### GET /api/users/profile
Get current user profile.

### PATCH /api/users/profile
Update current user profile.

### GET /api/users/preferences
Get user preferences.

### PATCH /api/users/preferences
Update user preferences.

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": { ... }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Record not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict - Record already exists",
  "details": "Unique constraint failed on: email"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred processing your request"
}
```

---

## Data Models

### User Roles
- `SUPER_ADMIN`: Full system access
- `LOCATION_ADMIN`: Manage multiple locations
- `MANAGER`: Manage assigned locations
- `SALES`: Create orders, quotes, invoices
- `WAREHOUSE`: Inventory operations

### Order Status
- `PENDING`: Order created, awaiting processing
- `PROCESSING`: Order being fulfilled
- `COMPLETED`: Order fulfilled
- `CANCELLED`: Order cancelled
- `ON_HOLD`: Order temporarily paused

### Payment Status
- `PENDING`: Payment not yet received
- `PARTIAL`: Partial payment received
- `PAID`: Fully paid
- `REFUNDED`: Payment refunded
- `FAILED`: Payment failed

### Quote Status
- `DRAFT`: Quote being edited
- `PENDING`: Quote awaiting review
- `SENT`: Quote sent to customer
- `ACCEPTED`: Customer accepted quote
- `REJECTED`: Customer rejected quote
- `EXPIRED`: Quote past valid date

### Invoice Status
- `DRAFT`: Invoice being prepared
- `SENT`: Invoice sent to customer
- `PARTIALLY_PAID`: Partial payment received
- `PAID`: Fully paid
- `OVERDUE`: Past due date
- `CANCELLED`: Invoice cancelled
- `WRITTEN_OFF`: Bad debt

### Fulfillment Types
- `PICKUP`: Customer pickup
- `DELIVERY`: Delivery to customer
- `WILL_CALL`: Will call when ready

### Payment Methods
- `CASH`
- `CREDIT_CARD`
- `DEBIT_CARD`
- `CHECK`
- `ACCOUNT`: On account (A/R)
- `WIRE_TRANSFER`
- `ACH`

---

## Best Practices

1. **Always check response status codes** before parsing JSON
2. **Handle rate limiting** by respecting `Retry-After` headers
3. **Use filters and pagination** for large datasets
4. **Include error handling** for all API calls
5. **Never log sensitive data** (passwords, tokens, payment info)
6. **Validate input on client** before API calls
7. **Use appropriate HTTP methods** (GET for reads, POST for creates, PATCH for updates)
8. **Test with soft-deleted records** - deleted records (deletedAt != null) are excluded from most queries
