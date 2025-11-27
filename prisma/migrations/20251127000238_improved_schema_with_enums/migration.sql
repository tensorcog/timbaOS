/*
  Warnings:

  - The `status` column on the `Agent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `scope` column on the `Agent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `customerType` column on the `Customer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `creditLimit` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to drop the column `approvedBy` on the `InventoryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `requestedBy` on the `InventoryTransfer` table. All the data in the column will be lost.
  - The `status` column on the `InventoryTransfer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `taxRate` on the `Location` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,4)`.
  - You are about to alter the column `price` on the `LocationPricing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `cost` on the `LocationPricing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `totalAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `fulfillmentType` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `deliveryFee` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `discountAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `orderType` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `subtotal` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `taxAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `price` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `discount` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `basePrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `Quote` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `subtotal` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `discountAmount` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `taxAmount` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `deliveryFee` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `totalAmount` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `unitPrice` on the `QuoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `discount` on the `QuoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `subtotal` on the `QuoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - Added the required column `requestedById` to the `InventoryTransfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `InventoryTransfer` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `paymentMethod` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'LOCATION_ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'CONTRACTOR', 'BUILDER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'POS', 'QUOTE_CONVERSION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'ACCOUNT', 'WIRE_TRANSFER');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY', 'WILL_CALL');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "AgentScope" AS ENUM ('LOCATION', 'GLOBAL');

-- DropForeignKey
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT "InventoryTransfer_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT "InventoryTransfer_requestedBy_fkey";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "status",
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "scope",
ADD COLUMN     "scope" "AgentScope" NOT NULL DEFAULT 'LOCATION';

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerType",
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'RETAIL',
ALTER COLUMN "creditLimit" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "InventoryTransfer" DROP COLUMN "approvedBy",
DROP COLUMN "requestedBy",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requestedById" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TransferStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "taxRate" SET DATA TYPE DECIMAL(5,4);

-- AlterTable
ALTER TABLE "LocationPricing" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "fulfillmentType",
ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
ALTER COLUMN "deliveryFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "orderType",
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'STANDARD',
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "status",
ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "deliveryFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "QuoteItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_accountNumber_idx" ON "Customer"("accountNumber");

-- CreateIndex
CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");

-- CreateIndex
CREATE INDEX "InventoryTransfer_status_idx" ON "InventoryTransfer"("status");

-- CreateIndex
CREATE INDEX "InventoryTransfer_requestedById_idx" ON "InventoryTransfer"("requestedById");

-- CreateIndex
CREATE INDEX "InventoryTransfer_approvedById_idx" ON "InventoryTransfer"("approvedById");

-- CreateIndex
CREATE INDEX "Location_code_idx" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "Location_isWarehouse_idx" ON "Location"("isWarehouse");

-- CreateIndex
CREATE INDEX "Location_managerId_idx" ON "Location"("managerId");

-- CreateIndex
CREATE INDEX "LocationPricing_effectiveFrom_idx" ON "LocationPricing"("effectiveFrom");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_salesRepId_idx" ON "Order"("salesRepId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_processedAt_idx" ON "Payment"("processedAt");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "ProductRecommendation_recommendedProductId_idx" ON "ProductRecommendation"("recommendedProductId");

-- CreateIndex
CREATE INDEX "Quote_quoteNumber_idx" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_createdById_idx" ON "Quote"("createdById");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_validUntil_idx" ON "Quote"("validUntil");

-- CreateIndex
CREATE INDEX "QuoteItem_productId_idx" ON "QuoteItem"("productId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "TransferItem_productId_idx" ON "TransferItem"("productId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
