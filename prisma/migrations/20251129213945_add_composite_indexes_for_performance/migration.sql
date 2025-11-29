-- CreateIndex
CREATE INDEX "Invoice_customerId_status_dueDate_idx" ON "Invoice"("customerId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_locationId_status_invoiceDate_idx" ON "Invoice"("locationId", "status", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "InvoicePayment_gatewayType_gatewayTransactionId_idx" ON "InvoicePayment"("gatewayType", "gatewayTransactionId");
