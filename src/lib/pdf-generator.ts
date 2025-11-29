import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import prisma from './prisma';
import Decimal from 'decimal.js';

interface InvoicePDFOptions {
  invoiceId: string;
  templateId?: string;
}

interface InvoiceData {
  invoice: any;
  customer: any;
  location: any;
  items: any[];
  payments?: any[];
  template?: any;
  companySettings?: any;
}

export async function generateInvoicePDF(options: InvoicePDFOptions): Promise<Buffer> {
  const { invoiceId, templateId } = options;

  // Fetch invoice data with all relations
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      Customer: true,
      Location: true,
      InvoiceItem: {
        include: {
          Product: true,
        },
      },
      InvoicePayment: {
        orderBy: {
          paymentDate: 'desc',
        },
      },
      // Note: Template relation not yet added to schema, will be null
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get company settings
  const companySettings = await prisma.companySettings.findFirst();

  // TODO: Template support - uncomment when InvoiceTemplate model is added to schema relations
  // Get template if specified or from invoice
  let template = null;
  // if (templateId) {
  //   template = await prisma.invoiceTemplate.findUnique({
  //     where: { id: templateId },
  //   });
  // } else if (invoice.templateId) {
  //   template = await prisma.invoiceTemplate.findUnique({
  //     where: { id: invoice.templateId },
  //   });
  // }

  // // If still no template, get default
  // if (!template) {
  //   template = await prisma.invoiceTemplate.findFirst({
  //     where: { isDefault: true, isActive: true },
  //   });
  // }

  const invoiceData: InvoiceData = {
    invoice,
    customer: invoice.Customer,
    location: invoice.Location,
    items: invoice.InvoiceItem,
    payments: invoice.InvoicePayment,
    template,
    companySettings,
  };

  return createPDFDocument(invoiceData);
}

function createPDFDocument(data: InvoiceData): Buffer {
  const doc = new jsPDF();
  const { invoice, customer, location, items, payments, companySettings, template } = data;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // ===== HEADER =====
  if (companySettings?.logo) {
    // TODO: Add logo image loading
    // For now, skip logo
  }

  // Company Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companySettings?.companyName || 'Bills Supplies', margin, yPos);
  yPos += 8;

  // Company Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companySettings?.address) {
    doc.text(companySettings.address, margin, yPos);
    yPos += 5;
  }
  if (companySettings?.phone || companySettings?.email) {
    const contactInfo = [companySettings.phone, companySettings.email].filter(Boolean).join(' | ');
    doc.text(contactInfo, margin, yPos);
    yPos += 5;
  }
  if (companySettings?.taxId) {
    doc.text(`Tax ID: ${companySettings.taxId}`, margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  // ===== INVOICE TITLE =====
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, 25, { align: 'right' });

  // Invoice Number and Status
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - margin, 35, { align: 'right' });
  doc.text(`Status: ${invoice.status}`, pageWidth - margin, 42, { align: 'right' });

  // ===== BILL TO & INVOICE DETAILS =====
  yPos = 60;

  // Left column - Bill To
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customer.name, margin, yPos);
  yPos += 5;
  if (customer.address) {
    doc.text(customer.address, margin, yPos);
    yPos += 5;
  }
  if (customer.email) {
    doc.text(customer.email, margin, yPos);
    yPos += 5;
  }
  if (customer.phone) {
    doc.text(customer.phone, margin, yPos);
    yPos += 5;
  }

  // Right column - Invoice Details
  const rightCol = pageWidth - margin;
  let detailYPos = 60;

  interface DetailRow {
    label: string;
    value: string;
  }

  const details: DetailRow[] = [
    { label: 'Invoice Date:', value: new Date(invoice.invoiceDate).toLocaleDateString() },
    { label: 'Due Date:', value: new Date(invoice.dueDate).toLocaleDateString() },
    { label: 'Payment Terms:', value: `Net ${invoice.paymentTermDays}` },
  ];

  if (invoice.orderId) {
    details.push({ label: 'Order Reference:', value: invoice.orderId.substring(0, 8) });
  }

  details.forEach(detail => {
    doc.setFont('helvetica', 'bold');
    doc.text(detail.label, rightCol - 80, detailYPos, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(detail.value, rightCol, detailYPos, { align: 'right' });
    detailYPos += 6;
  });

  yPos = Math.max(yPos, detailYPos) + 10;

  // ===== LINE ITEMS TABLE =====
  const tableData = items.map(item => [
    item.Product.name,
    item.description || '',
    item.quantity.toString(),
    `$${new Decimal(item.unitPrice).toFixed(2)}`,
    item.discount > 0 ? `$${new Decimal(item.discount).toFixed(2)}` : '-',
    `$${new Decimal(item.subtotal).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Product', 'Description', 'Qty', 'Unit Price', 'Discount', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [102, 126, 234], // Purple theme
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 60 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore - autoTable adds finalY
  yPos = doc.lastAutoTable.finalY + 10;

  // ===== TOTALS =====
  const totalsX = pageWidth - margin - 60;
  const labelX = totalsX - 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text('Subtotal:', labelX, yPos);
  doc.text(`$${new Decimal(invoice.subtotal).toFixed(2)}`, totalsX, yPos, { align: 'right' });
  yPos += 6;

  if (new Decimal(invoice.discountAmount).greaterThan(0)) {
    doc.text('Discount:', labelX, yPos);
    doc.text(`-$${new Decimal(invoice.discountAmount).toFixed(2)}`, totalsX, yPos, { align: 'right' });
    yPos += 6;
  }

  if (new Decimal(invoice.deliveryFee).greaterThan(0)) {
    doc.text('Delivery Fee:', labelX, yPos);
    doc.text(`$${new Decimal(invoice.deliveryFee).toFixed(2)}`, totalsX, yPos, { align: 'right' });
    yPos += 6;
  }

  doc.text('Tax:', labelX, yPos);
  doc.text(`$${new Decimal(invoice.taxAmount).toFixed(2)}`, totalsX, yPos, { align: 'right' });
  yPos += 6;

  // Draw line above total
  doc.setLineWidth(0.5);
  doc.line(labelX, yPos, totalsX, yPos);
  yPos += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', labelX, yPos + 5);
  doc.text(`$${new Decimal(invoice.totalAmount).toFixed(2)}`, totalsX, yPos + 5, { align: 'right' });
  yPos += 10;

  // Payment information
  if (new Decimal(invoice.paidAmount).greaterThan(0)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', labelX, yPos);
    doc.text(`$${new Decimal(invoice.paidAmount).toFixed(2)}`, totalsX, yPos, { align: 'right' });
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    const balanceDue = new Decimal(invoice.balanceDue);
    const balanceColor = balanceDue.greaterThan(0) ? [220, 38, 38] : [34, 197, 94];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text('Balance Due:', labelX, yPos);
    doc.text(`$${balanceDue.toFixed(2)}`, totalsX, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset color
    yPos += 10;
  }

  // ===== PAYMENT HISTORY (if partial payments) =====
  if (payments && payments.length > 0 && yPos < pageHeight - 80) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment History:', margin, yPos);
    yPos += 2;

    const paymentTableData = payments.map(payment => [
      new Date(payment.paymentDate).toLocaleDateString(),
      payment.paymentMethod,
      payment.referenceNumber || '-',
      `$${new Decimal(payment.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: paymentTableData,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: pageWidth - 180 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // ===== NOTES & TERMS =====
  if ((invoice.notes || template?.defaultNotes) && yPos < pageHeight - 40) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notes = invoice.notes || template?.defaultNotes || '';
    const notesLines = doc.splitTextToSize(notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 4 + 5;
  }

  if ((invoice.terms || template?.defaultTerms) && yPos < pageHeight - 30) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Payment Terms:', margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const terms = invoice.terms || template?.defaultTerms || '';
    const termsLines = doc.splitTextToSize(terms, pageWidth - 2 * margin);
    doc.text(termsLines, margin, yPos);
  }

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  const footerText = `Generated on ${new Date().toLocaleDateString()} | ${companySettings?.website || ''}`;
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // CRITICAL: Memory optimization - use datauri instead of arraybuffer
  // datauri output is more memory-efficient for large PDFs
  // Convert to buffer only at the end to minimize memory footprint
  const pdfDataUri = doc.output('datauristring');
  const base64Data = pdfDataUri.split(',')[1];
  
  // Return buffer from base64 (more memory efficient than arraybuffer)
  return Buffer.from(base64Data, 'base64');
}


// TODO: Credit Note PDF Generation - uncomment when CreditNote model is added to schema
// export async function generateCreditNotePDF(creditNoteId: string): Promise<Buffer> {
//   const creditNote = await prisma.creditNote.findUnique({
//     where: { id: creditNoteId },
//     include: {
//       Invoice: {
//         include: {
//           InvoiceItem: {
//             include: {
//               Product: true,
//             },
//           },
//         },
//       },
//       Customer: true,
//       Location: true,
//     },
//   });

//   if (!creditNote) {
//     throw new Error('Credit note not found');
//   }

//   const companySettings = await prisma.companySettings.findFirst();

//   const doc = new jsPDF();
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const margin = 20;
//   let yPos = margin;

//   // Implementation continues...
//   // (Full implementation available in git history)

//   return Buffer.from(doc.output('arraybuffer'));
// }
