-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('ISSUED', 'APPLIED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('FIRST_REMINDER', 'SECOND_REMINDER', 'FINAL_NOTICE', 'COURTESY_REMINDER');

-- CreateEnum
CREATE TYPE "InvoiceEmailType" AS ENUM ('INVOICE_DELIVERY', 'PAYMENT_REMINDER', 'PAYMENT_CONFIRMATION', 'OVERDUE_NOTICE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "PaymentGatewayType" AS ENUM ('STRIPE', 'PAYPAL', 'MANUAL');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "autoGenerateInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredPaymentGateway" "PaymentGatewayType";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paypalOrderId" TEXT,
ADD COLUMN     "recurringInvoiceId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "InvoicePayment" ADD COLUMN     "gatewayFee" DECIMAL(12,2),
ADD COLUMN     "gatewayMetadata" JSONB,
ADD COLUMN     "gatewayTransactionId" TEXT,
ADD COLUMN     "gatewayType" "PaymentGatewayType";

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "templateData" JSONB NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "creditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "appliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'ISSUED',
    "refundProcessed" BOOLEAN NOT NULL DEFAULT false,
    "refundDate" TIMESTAMP(3),
    "refundMethod" "PaymentGatewayType",
    "refundTransactionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "logoUrl" TEXT,
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysOverdue" INTEGER NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT true,
    "emailStatus" TEXT,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceEmailLog" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "emailType" "InvoiceEmailType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringInvoice_customerId_idx" ON "RecurringInvoice"("customerId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_locationId_idx" ON "RecurringInvoice"("locationId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextBillingDate_idx" ON "RecurringInvoice"("nextBillingDate");

-- CreateIndex
CREATE INDEX "RecurringInvoice_isActive_idx" ON "RecurringInvoice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");

-- CreateIndex
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");

-- CreateIndex
CREATE INDEX "CreditNote_status_idx" ON "CreditNote"("status");

-- CreateIndex
CREATE INDEX "CreditNote_creditNoteNumber_idx" ON "CreditNote"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_isDefault_idx" ON "InvoiceTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_isActive_idx" ON "InvoiceTemplate"("isActive");

-- CreateIndex
CREATE INDEX "InvoiceReminder_invoiceId_idx" ON "InvoiceReminder"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceReminder_sentAt_idx" ON "InvoiceReminder"("sentAt");

-- CreateIndex
CREATE INDEX "InvoiceEmailLog_invoiceId_idx" ON "InvoiceEmailLog"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEmailLog_sentAt_idx" ON "InvoiceEmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "InvoiceEmailLog_status_idx" ON "InvoiceEmailLog"("status");

-- CreateIndex
CREATE INDEX "Invoice_templateId_idx" ON "Invoice"("templateId");

-- CreateIndex
CREATE INDEX "Invoice_recurringInvoiceId_idx" ON "Invoice"("recurringInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEmailLog" ADD CONSTRAINT "InvoiceEmailLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
