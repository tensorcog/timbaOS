import prisma from '@/lib/prisma';
import { QuoteForm } from '@/components/quotes/quote-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewQuotePage() {
    const [customers, products, locations] = await Promise.all([
        prisma.customer.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                taxExempt: true,
            },
            orderBy: { name: 'asc' },
        }),
        prisma.product.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                sku: true,
                basePrice: true,
                category: true,
            },
            orderBy: { name: 'asc' },
        }),
        prisma.location.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                code: true,
                taxRate: true,
            },
        }),
    ]);

    // Serialize for client component
    const serializedData = {
        customers,
        products: products.map(p => ({
            ...p,
            basePrice: parseFloat(p.basePrice.toString()),
        })),
        locations: locations.map(l => ({
            ...l,
            taxRate: parseFloat(l.taxRate.toString()),
        })),
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/quotes"
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-semibold">Create New Quote</h1>
            </div>

            <QuoteForm {...serializedData} />
        </div>
    );
}
