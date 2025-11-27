import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, MapPin, FileText, DollarSign, Edit, History } from 'lucide-react';
import { AuditHistory } from '@/components/audit-history';

interface QuotePageProps {
    params: {
        id: string;
    };
}

export default async function QuotePage({ params }: QuotePageProps) {
    const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
            Customer: true,
            Location: true,
            User: true,
            QuoteItem: {
                include: {
                    Product: true,
                },
            },
        },
    });

    if (!quote) {
        notFound();
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'SENT':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'ACCEPTED':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'REJECTED':
            case 'EXPIRED':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const isExpired = new Date(quote.validUntil) < new Date();
    const displayStatus = isExpired && quote.status === 'PENDING' ? 'EXPIRED' : quote.status;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/quotes"
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Quote {quote.quoteNumber}</h1>
                    <p className="text-sm text-muted-foreground">
                        Created {new Date(quote.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(displayStatus)}`}>
                    {displayStatus}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer & Location Info */}
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4">Quote Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <User className="h-4 w-4" />
                                    Customer
                                </div>
                                <div className="font-medium">{quote.Customer.name}</div>
                                <div className="text-sm text-muted-foreground">{quote.Customer.email}</div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <MapPin className="h-4 w-4" />
                                    Location
                                </div>
                                <div className="font-medium">{quote.Location.name}</div>
                                <div className="text-sm text-muted-foreground">{quote.Location.code}</div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <Calendar className="h-4 w-4" />
                                    Valid Until
                                </div>
                                <div className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                                    {new Date(quote.validUntil).toLocaleDateString()}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <User className="h-4 w-4" />
                                    Created By
                                </div>
                                <div className="font-medium">{quote.User.name}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quote Items */}
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4">Items</h2>
                        <div className="space-y-3">
                            {quote.QuoteItem.map((item) => (
                                <div key={item.id} className="p-4 rounded-lg border bg-muted/50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="font-mono text-xs text-muted-foreground">
                                                {item.Product.sku}
                                            </div>
                                            <div className="font-medium">{item.Product.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                ${Number(item.unitPrice).toFixed(2)} × {item.quantity}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">
                                                ${Number(item.subtotal).toFixed(2)}
                                            </div>
                                            {Number(item.discount) > 0 && (
                                                <div className="text-sm text-green-600">
                                                    -${Number(item.discount).toFixed(2)} discount
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    {quote.notes && (
                        <div className="rounded-xl border bg-card p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Notes
                            </h2>
                            <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                    )}

                    {/* Audit History */}
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <History className="h-5 w-5" />
                            History
                        </h2>
                        <AuditHistory entityType="Quote" entityId={quote.id} />
                    </div>
                </div>

                {/* Right Column - Totals */}
                <div className="space-y-6">
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Quote Total
                        </h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>${Number(quote.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(quote.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount:</span>
                                    <span>-${Number(quote.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(quote.deliveryFee) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>Delivery Fee:</span>
                                    <span>${Number(quote.deliveryFee).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span>Tax:</span>
                                <span>${Number(quote.taxAmount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t">
                                <span>Total:</span>
                                <span>${Number(quote.totalAmount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {quote.status === 'PENDING' && !isExpired && (
                        <div className="rounded-xl border bg-card p-6">
                            <h2 className="text-lg font-semibold mb-4">Actions</h2>
                            <div className="space-y-2">
                                <Link
                                    href={`/dashboard/quotes/${quote.id}/edit`}
                                    className="w-full py-2 px-4 rounded-lg border border-purple-600 text-purple-600 font-medium hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit Quote
                                </Link>
                                <button className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                                    Send Quote
                                </button>
                                <button className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors">
                                    Convert to Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
