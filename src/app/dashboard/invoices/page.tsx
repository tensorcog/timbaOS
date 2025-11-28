import prisma from "@/lib/prisma";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { FileText, Plus } from "lucide-react";

export default async function InvoicesPage() {
    const invoices = await prisma.invoice.findMany({
        include: {
            Customer: {
                select: {
                    id: true,
                    name: true,
                },
            },
            Location: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
        orderBy: {
            invoiceDate: "desc",
        },
        take: 100,
    });

    const getStatusColor = (status: string, balanceDue: any, dueDate: Date) => {
        if (status === "PAID") return "bg-green-500/10 text-green-500";
        if (status === "CANCELLED") return "bg-gray-500/10 text-gray-500";
        if (status === "DRAFT") return "bg-blue-500/10 text-blue-500";
        if (status === "PARTIALLY_PAID") return "bg-yellow-500/10 text-yellow-500";
        if (status === "OVERDUE" || (Number(balanceDue) > 0 && isPast(dueDate))) {
            return "bg-red-500/10 text-red-500";
        }
        return "bg-gray-500/10 text-gray-500";
    };

    const getStatusLabel = (status: string) => {
        return status.replace(/_/g, " ");
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Invoices</h1>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/invoices/new"
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Invoice
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3 font-semibold">Invoice #</th>
                                    <th className="text-left p-3 font-semibold">Customer</th>
                                    <th className="text-left p-3 font-semibold">Location</th>
                                    <th className="text-left p-3 font-semibold">Date</th>
                                    <th className="text-left p-3 font-semibold">Due Date</th>
                                    <th className="text-right p-3 font-semibold">Amount</th>
                                    <th className="text-right p-3 font-semibold">Balance</th>
                                    <th className="text-center p-3 font-semibold">Status</th>
                                    <th className="text-center p-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No invoices found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b hover:bg-muted/50">
                                            <td className="p-3">
                                                <Link
                                                    href={`/dashboard/invoices/${invoice.id}`}
                                                    className="font-mono text-sm text-blue-600 hover:underline"
                                                >
                                                    {invoice.invoiceNumber}
                                                </Link>
                                            </td>
                                            <td className="p-3">{invoice.Customer.name}</td>
                                            <td className="p-3">
                                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                    {invoice.Location.code}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground">
                                                {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                                            </td>
                                            <td className="p-3 text-right font-semibold">
                                                ${Number(invoice.totalAmount).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right">
                                                ${Number(invoice.balanceDue).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                                                        invoice.status,
                                                        invoice.balanceDue,
                                                        invoice.dueDate
                                                    )}`}
                                                >
                                                    {getStatusLabel(invoice.status)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Link
                                                    href={`/dashboard/invoices/${invoice.id}`}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
