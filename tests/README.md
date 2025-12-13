# Test Suite Documentation

This directory contains regression test scripts for the Bill's Supplies application.

## Available Test Suites

### 1. RBAC Tests ([rbac-test.sh](rbac-test.sh))
Tests role-based access control and permissions.

**Tests included:**
- Admin user full access
- Sales user limited access
- Manager user analytics access
- Unauthenticated access blocking
- Quote creation permissions

**Usage:**
```bash
# Run all RBAC tests
./tests/rbac-test.sh

# Run specific test
./tests/rbac-test.sh test_admin_api
./tests/rbac-test.sh test_sales_api
./tests/rbac-test.sh test_manager_api
./tests/rbac-test.sh test_unauthenticated
```

### 2. Quote Validation Tests ([quote-validation-test.sh](quote-validation-test.sh))
Tests quote creation, validation, and conversion logic.

**Tests included:**
- Quote creation validation
- Quote total calculation (subtotal, tax, discounts, delivery fees)
- Quote tax calculation for exempt and non-exempt customers
- Quote delivery fee calculation based on threshold
- Quote status tracking (DRAFT, PENDING, SENT, ACCEPTED, REJECTED, EXPIRED)
- Quote validity period enforcement
- Quote number generation and uniqueness
- Quote access permissions (RBAC)
- Quote to order conversion validation
- Quote conversion validation rules (no re-conversion, status checks, expiry checks)

**Usage:**
```bash
# Run all quote validation tests
./tests/quote-validation-test.sh

# Run specific test
./tests/quote-validation-test.sh test_quote_creation
./tests/quote-validation-test.sh test_quote_totals
./tests/quote-validation-test.sh test_quote_tax_calculation
./tests/quote-validation-test.sh test_quote_delivery_fee
./tests/quote-validation-test.sh test_quote_status
./tests/quote-validation-test.sh test_quote_validity
./tests/quote-validation-test.sh test_quote_number_generation
./tests/quote-validation-test.sh test_quote_permissions
./tests/quote-validation-test.sh test_quote_conversion
./tests/quote-validation-test.sh test_quote_conversion_rules
```

### 3. Order Validation Tests ([order-validation-test.sh](order-validation-test.sh))
Tests order creation, validation, and business logic.

**Tests included:**
- Order creation validation
- Order total calculation (subtotal, tax, discounts, delivery fees)
- Tax calculation for exempt and non-exempt customers
- Order payment status tracking
- Order edit validation (only PENDING orders can be edited)
- Order status transitions (PENDING → CONFIRMED, CANCELLED)
- Order cancellation workflow
- Quote to order conversion validation

**Usage:**
```bash
# Run all order validation tests
./tests/order-validation-test.sh

# Run specific test
./tests/order-validation-test.sh test_order_creation
./tests/order-validation-test.sh test_order_totals
./tests/order-validation-test.sh test_tax_calculation
./tests/order-validation-test.sh test_order_edit_validation
./tests/order-validation-test.sh test_order_status_transitions
./tests/order-validation-test.sh test_order_cancellation
./tests/order-validation-test.sh test_quote_conversion
./tests/order-validation-test.sh test_order_payment_status
```

### 4. Inventory Validation Tests ([inventory-validation-test.sh](inventory-validation-test.sh))
Tests inventory management and tracking.

**Tests included:**
- Inventory levels tracking per location
- Low stock detection and alerts
- Inventory deduction after POS sales
- Multi-location inventory management
- Inventory query performance

**Usage:**
```bash
# Run all inventory validation tests
./tests/inventory-validation-test.sh

# Run specific test
./tests/inventory-validation-test.sh test_inventory_levels
./tests/inventory-validation-test.sh test_low_stock_detection
./tests/inventory-validation-test.sh test_inventory_deduction
./tests/inventory-validation-test.sh test_multi_location_inventory
./tests/inventory-validation-test.sh test_inventory_query
```

### 5. POS Validation Tests ([pos-validation-test.sh](pos-validation-test.sh))
Tests Point of Sale operations and workflows.

**Tests included:**
- POS checkout flow with payment
- Walk-in customer creation
- Multiple payment methods (split payments)
- POS tax calculation
- POS products endpoint

**Usage:**
```bash
# Run all POS validation tests
./tests/pos-validation-test.sh

# Run specific test
./tests/pos-validation-test.sh test_pos_checkout
./tests/pos-validation-test.sh test_walkin_customer
./tests/pos-validation-test.sh test_multiple_payments
./tests/pos-validation-test.sh test_pos_tax_calculation
./tests/pos-validation-test.sh test_pos_products
```

### 6. Customer Validation Tests ([customer-validation-test.sh](customer-validation-test.sh))
Tests customer management functionality.

**Tests included:**
- Customer types (RETAIL vs WHOLESALE)
- Tax-exempt status handling
- Customer listing and search
- Customer email uniqueness
- Walk-in customer generation

**Usage:**
```bash
# Run all customer validation tests
./tests/customer-validation-test.sh

# Run specific test
./tests/customer-validation-test.sh test_customer_types
./tests/customer-validation-test.sh test_tax_exempt
./tests/customer-validation-test.sh test_customer_listing
./tests/customer-validation-test.sh test_customer_email_uniqueness
./tests/customer-validation-test.sh test_walkin_generation
```

### 7. Product Validation Tests ([product-validation-test.sh](product-validation-test.sh))
Tests product catalog operations.

**Tests included:**
- Product listing and filtering
- Product categories
- SKU uniqueness validation
- Active/inactive product status
- Product pricing (base and location-specific)

**Usage:**
```bash
# Run all product validation tests
./tests/product-validation-test.sh

# Run specific test
./tests/product-validation-test.sh test_product_listing
./tests/product-validation-test.sh test_product_categories
./tests/product-validation-test.sh test_sku_uniqueness
./tests/product-validation-test.sh test_product_active_status
./tests/product-validation-test.sh test_product_pricing
./tests/product-validation-test.sh test_location_pricing
```

### 8. Audit Log Validation Tests ([audit-log-validation-test.sh](audit-log-validation-test.sh))
Tests audit logging and tracking.

**Tests included:**
- Quote audit log retrieval
- Order audit log retrieval
- User attribution in logs
- Timestamp accuracy
- Audit log action types

**Usage:**
```bash
# Run all audit log validation tests
./tests/audit-log-validation-test.sh

# Run specific test
./tests/audit-log-validation-test.sh test_quote_audit
./tests/audit-log-validation-test.sh test_order_audit
./tests/audit-log-validation-test.sh test_user_attribution
./tests/audit-log-validation-test.sh test_timestamp_accuracy
./tests/audit-log-validation-test.sh test_audit_actions
```

### 9. Export Validation Tests ([export-validation-test.sh](export-validation-test.sh))
Tests data export functionality.

**Tests included:**
- Export endpoint access
- Export RBAC (role-based access control)
- Analytics data for export
- Export data completeness
- Export performance

**Usage:**
```bash
# Run all export validation tests
./tests/export-validation-test.sh

# Run specific test
./tests/export-validation-test.sh test_export_access
./tests/export-validation-test.sh test_export_rbac
./tests/export-validation-test.sh test_analytics_export
./tests/export-validation-test.sh test_export_completeness
./tests/export-validation-test.sh test_export_performance
```

## Running All Tests

Use the comprehensive test runner in the root directory:

```bash
# From project root
./cmd/run-all-tests.sh
```

This will run all test suites and provide a summary of results.

## Prerequisites

1. **Server Running**: Make sure the development server is running on port 3000:
   ```bash
   npm run dev
   ```

2. **Database Seeded**: Ensure the database has test data:
   ```bash
   npx prisma db seed
   ```

3. **Dependencies Installed**: Install required Node packages:
   ```bash
   npm install
   ```

## Test Output

All tests will create a `test-results` directory with:
- Cookie files for session management
- Test output logs
- Temporary data files for cross-test validation

## Test Structure

Each test script follows this pattern:

1. **Setup**: Login with appropriate user credentials
2. **Test Execution**: Make API calls and database queries
3. **Validation**: Check responses, status codes, and database state
4. **Reporting**: Use colored output (✓ PASS, ✗ FAIL, ℹ INFO)

## Adding New Tests

To add a new test:

1. Create a new test script in the `tests/` directory
2. Follow the naming convention: `*-test.sh`
3. Make it executable: `chmod +x tests/your-test.sh`
4. Add it to `cmd/run-all-tests.sh`
5. Document it in this README

## Common Issues

**Server not running**:
```bash
ERROR: Server is not running on http://localhost:3000
```
Solution: Start the server with `npm run dev`

**No test data**:
```
INFO: No pending orders found to test
```
Solution: Run `npx prisma db seed` to populate test data

**Authentication failures**:
```
FAIL: Admin login failed
```
Solution: Check user credentials in `prisma/seed.ts` and verify the database is seeded

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run regression tests
  run: |
    npm run build
    npm run dev &
    sleep 5
    ./cmd/run-all-tests.sh
```

## Test Coverage

Current test coverage areas:
- ✅ Authentication & Authorization (RBAC)
- ✅ Quote lifecycle (create, status transitions, conversion, validity)
- ✅ Order lifecycle (create, edit, confirm, cancel)
- ✅ Financial calculations (totals, tax, discounts, delivery fees)
- ✅ Quote to order conversion with validation rules
- ✅ Payment status tracking
- ✅ Status transitions and workflows
- ✅ Permission-based data filtering
- ✅ Unique identifier generation (quote numbers, order numbers)
- ✅ Inventory management (levels, deduction, low stock, multi-location)
- ✅ POS operations (checkout, walk-in customers, split payments)
- ✅ Customer management (types, tax-exempt, uniqueness)
- ✅ Product catalog (listing, categories, SKU uniqueness, pricing)
- ✅ Audit logging (tracking, user attribution, timestamps)
- ✅ Data export (access, RBAC, completeness, performance)

### 10. AI Integration Tests (Jest)
Tests AI functionality with Ollama and MCP tools.

**Test Files:**
- `src/app/api/chat/__tests__/route.test.ts` - Next.js Chat API tests
- `ai-bridge-server/__tests__/server.test.js` - AI bridge server tests

**Tests included:**
- Authentication and authorization for chat API
- Request validation (message length, format, history)
- AI bridge server communication
- MCP tool execution (get_orders, get_products, get_customers, get_inventory, get_analytics)
- Ollama integration with tool calling
- Conversation history handling
- Error handling (network errors, invalid responses, database errors)

**Usage:**
```bash
# Run all Jest tests (including AI tests)
npm test

# Run with coverage
npm run test:coverage

# Run AI bridge server tests specifically
cd ai-bridge-server
npm test

# Run in watch mode
npm run test:watch
```

**Coverage Thresholds:**
- Next.js API: 80% coverage (branches, functions, lines, statements)
- AI Bridge Server: 70% coverage (branches, functions, lines, statements)

See [tests/AI_TESTS.md](AI_TESTS.md) for detailed AI test documentation.

## Future Test Additions

Potential areas for expansion:
- Transfer workflows and inventory transfers
- Payment processing and refunds
- Multi-currency support
- Advanced analytics calculations
- Batch operations and bulk updates
- AI agent autonomous recommendations
- Multi-turn conversation flows
- Tool chaining scenarios
```
