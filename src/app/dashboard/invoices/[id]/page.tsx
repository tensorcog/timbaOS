import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, Mail, DollarSign, Calendar, User, MapPin } from "lucide-react";
import { format, isPast } from "date-fns";
import { InvoicePaymentList } from "@/components/invoices/invoice-payment-list";
import { RecordPaymentButton } from "@/components/invoices/record-payment-button";

export default async function InvoiceDetailsPage({ params }: { params: { id: string } }) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: params.id },
        include: {
            Customer: true,
            Location: true,
            InvoiceItem: {
                include: {
                    Product: true,
                },
            },
            InvoicePayment: {
                include: {
                    RecordedBy: {
                        select: { name: true },
                    },
                },
                orderBy: {
                    paymentDate: 'desc',
                },
            },
        },
    });

    if (!invoice) {
        notFound();
    }

    const isPaid = invoice.status === 'PAID';
    const isCancelled = invoice.status === 'CANCELLED';

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/invoices"
                        className="h-10 w-10 rounded-lg border bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Created {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                    invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {invoice.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </button>
                    <button className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                    </button>
                    {!isPaid && !isCancelled && (
                        <RecordPaymentButton
                            invoiceId={invoice.id}
                            customerId={invoice.customerId}
                            balanceDue={Number(invoice.balanceDue)}
                        />
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
                {/* Customer Info */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="font-semibold">Bill To</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="font-medium text-base">{invoice.Customer.name}</p>
                        <p className="text-muted-foreground">{invoice.Customer.email}</p>
                        <p className="text-muted-foreground">{invoice.Customer.phone || 'No phone'}</p>
                        <p className="text-muted-foreground">{invoice.Customer.address || 'No address'}</p>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-500" />
                        </div>
                        <h3 className="font-semibold">Payment Details</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-medium">${Number(invoice.totalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid Amount</span>
                            <span className="font-medium text-green-600">-${Number(invoice.paidAmount).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t flex justify-between text-base">
                            <span className="font-semibold">Balance Due</span>
                            <span className="font-bold text-red-600">${Number(invoice.balanceDue).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Dates & Terms */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-500" />
                        </div>
                        <h3 className="font-semibold">Dates & Terms</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice Date</span>
                            <span>{format(new Date(invoice.invoiceDate), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Due Date</span>
                            <span className={isPast(new Date(invoice.dueDate)) && !isPaid ? "text-red-600 font-medium" : ""}>
                                {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Terms</span>
                            <span>Net {invoice.paymentTermDays}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Invoice Items */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="p-6 border-b">
                            <h3 className="font-semibold">Line Items</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Item</th>
                                        <th className="text-right p-4 font-medium text-muted-foreground">Qty</th>
                                        <th className="text-right p-4 font-medium text-muted-foreground">Price</th>
                                        <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invoice.InvoiceItem.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-4">
                                                <p className="font-medium">{item.Product.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                            </td>
                                            <td className="p-4 text-right">{item.quantity}</td>
                                            <td className="p-4 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                                            <td className="p-4 text-right font-medium">${Number(item.subtotal).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-muted/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>${Number(invoice.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax</span>
                                <span>${Number(invoice.taxAmount).toFixed(2)}</span>
                            </div>
                            {Number(invoice.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-${Number(invoice.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(invoice.deliveryFee) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>Delivery Fee</span>
                                    <span>${Number(invoice.deliveryFee).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${Number(invoice.totalAmount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Payment History */}
                    <div className="rounded-xl border bg-card">
                        <div className="p-6 border-b">
                            <h3 className="font-semibold">Payment History</h3>
                        </div>
                        <div className="p-6">
                            <InvoicePaymentList payments={invoice.InvoicePayment} />
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="rounded-xl border bg-card p-6">
                            <h3 className="font-semibold mb-2">Notes</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
