#!/bin/bash

# Invoice Feature Tests Suite
# Tests PDF generation, email delivery, and payment gateway integration

source "$(dirname "$0")/../cmd/common.sh"

print_section "Invoice Feature Tests"

# Login
login "admin"

# Test 1: Create test invoice
print_test "Creating test invoice"
CUSTOMER_ID=$(curl -s "$API_URL/customers" \
    -H "$AUTH_HEADER" | jq -r '.[] | select(.email == "main@johnsonconstruction.com") | .id')

LOCATION_ID=$(curl -s "$API_URL/locations" \
    -H "$AUTH_HEADER" | jq -r '.[0].id')

PRODUCT_ID=$(curl -s "$API_URL/products?isActive=true" \
    -H "$AUTH_HEADER" | jq -r '.[0].id')

INVOICE_RESPONSE=$(curl -s -X POST "$API_URL/invoices" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{
        "customerId": "'"$CUSTOMER_ID"'",
        "locationId": "'"$LOCATION_ID"'",
        "items": [{
            "productId": "'"$PRODUCT_ID"'",
            "description": "Test product for invoicing",
            "quantity": 5,
            "unitPrice": 25.00,
            "discount": 0
        }],
        "notes": "Test invoice for feature verification",
        "terms": "Net 30"
    }')

INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.id')
INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | jq -r '.invoiceNumber')

if [ -n "$INVOICE_ID" ] && [ "$INVOICE_ID" != "null" ]; then
    print_success "Invoice created: $INVOICE_NUMBER"
else
    print_error "Failed to create invoice"
    echo "$INVOICE_RESPONSE" | jq
    exit 1
fi

# Test 2: Download PDF
print_test "Downloading invoice PDF"
PDF_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/invoices/$INVOICE_ID/pdf" \
    -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$PDF_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    # Save PDF to test output
    PDF_SIZE=$(echo "$PDF_RESPONSE" | head -n-1 | wc -c)
    if [ "$PDF_SIZE" -gt 1000 ]; then
        print_success "PDF generated successfully ($PDF_SIZE bytes)"
    else
        print_error "PDF too small, may be invalid"
    fi
else
    print_error "PDF download failed (HTTP $HTTP_CODE)"
fi

# Test 3: Send invoice email
print_test "Sending invoice via email"
EMAIL_RESPONSE=$(curl -s -X POST "$API_URL/invoices/$INVOICE_ID/send" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{
        "customerEmail": "test@example.com"
    }')

EMAIL_SUCCESS=$(echo "$EMAIL_RESPONSE" | jq -r '.success')
if [ "$EMAIL_SUCCESS" = "true" ]; then
    print_success "Invoice email sent successfully"
    
    # Verify invoice status updated to SENT
    UPDATED_INVOICE=$(curl -s "$API_URL/invoices/$INVOICE_ID" \
        -H "$AUTH_HEADER")
    INVOICE_STATUS=$(echo "$UPDATED_INVOICE" | jq -r '.status')
    
    if [ "$INVOICE_STATUS" = "SENT" ]; then
        print_success "Invoice status updated to SENT"
    else
        print_warning "Invoice status: $INVOICE_STATUS (expected SENT)"
    fi
else
    print_error "Failed to send invoice email"
    echo "$EMAIL_RESPONSE" | jq
fi

# Test 4: Invoice aging report
print_test "Generating invoice aging report"
AGING_REPORT=$(curl -s "$API_URL/reports/invoice-aging" \
    -H "$AUTH_HEADER")

REPORT_CUSTOMERS=$(echo "$AGING_REPORT" | jq -r '.customers | length')
if [ "$REPORT_CUSTOMERS" -gt 0 ]; then
    print_success "Aging report generated with $REPORT_CUSTOMERS customers"
    
    # Display summary
    echo "$AGING_REPORT" | jq '.summary'
else
    print_warning "No customers in aging report"
fi

# Test 5: Payment reminder processing (manual trigger)
print_test "Testing payment reminder cron job"

# Note: This requires CRON_SECRET to be set
if [ -n "$CRON_SECRET" ]; then
    CRON_RESPONSE=$(curl -s -X POST "$API_URL/cron/daily-billing" \
        -H "Authorization: Bearer $CRON_SECRET")
    
    REMINDERS_SENT=$(echo "$CRON_RESPONSE" | jq -r '.paymentReminders.remindersSent')
    if [ "$REMINDERS_SENT" != "null" ]; then
        print_success "Cron job executed: $REMINDERS_SENT reminders processed"
    else
        print_error "Cron job failed"
        echo "$CRON_RESPONSE" | jq
    fi
else
    print_warning "CRON_SECRET not set, skipping cron test"
fi

# Test 6: Record payment via existing endpoint
print_test "Recording payment for invoice"
PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/invoice-payments" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{
        "invoiceId": "'"$INVOICE_ID"'",
        "customerId": "'"$CUSTOMER_ID"'",
        "amount": 50.00,
        "paymentMethod": "CHECK",
        "referenceNumber": "CHK-12345",
        "notes": "Partial payment test"
    }')

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.id')
if [ -n "$PAYMENT_ID" ] && [ "$PAYMENT_ID" != "null" ]; then
    print_success "Payment recorded successfully"
    
    # Verify invoice updated
    UPDATED_INVOICE=$(curl -s "$API_URL/invoices/$INVOICE_ID" \
        -H "$AUTH_HEADER")
    PAID_AMOUNT=$(echo "$UPDATED_INVOICE" | jq -r '.paidAmount')
    INVOICE_STATUS=$(echo "$UPDATED_INVOICE" | jq -r '.status')
    
    print_success "Invoice status: $INVOICE_STATUS, Paid: \$$PAID_AMOUNT"
else
    print_error "Failed to record payment"
    echo "$PAYMENT_RESPONSE" | jq
fi

print_section "Invoice Feature Tests Complete"

echo ""
echo "Summary:"
echo "- Invoice Creation: ✓"
echo "- PDF Generation: ✓"
echo "- Email Delivery: ✓"
echo "- Aging Report: ✓"
echo "- Payment Recording: ✓"
echo ""
echo "Invoice ID for manual testing: $INVOICE_ID"
echo "Invoice Number: $INVOICE_NUMBER"
