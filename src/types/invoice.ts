// Type definitions for email templates
import { Invoice, Customer, InvoicePayment } from '@prisma/client';

/**
 * Invoice with customer relation for email templates
 */
export type InvoiceWithCustomer = Invoice & {
  Customer: Customer;
};

/**
 * Invoice with customer and payments for detailed emails
 */
export type InvoiceWithDetails = Invoice & {
  Customer: Customer;
  InvoicePayment: (InvoicePayment & {
    RecordedBy: {
      name: string;
    };
  })[];
};
