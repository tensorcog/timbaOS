import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { QuoteEditForm } from '@/components/quotes/quote-edit-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditQuotePageProps {
    params: {
        id: string;
    };
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
    const [quote, customers, products, locations] = await Promise.all([
        prisma.quote.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
                location: true,
            },
        }),
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

    if (!quote) {
        notFound();
    }

    // Serialize for client component
    const serializedData = {
        quote: {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            customerId: quote.customerId,
            locationId: quote.locationId,
            notes: quote.notes,
            validUntil: quote.validUntil.toISOString(),
            items: quote.items.map(item => ({
                productId: item.productId,
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    sku: item.product.sku,
                    basePrice: parseFloat(item.product.basePrice.toString()),
                    category: item.product.category,
                },
                quantity: item.quantity,
                unitPrice: parseFloat(item.unitPrice.toString()),
                discount: parseFloat(item.discount.toString()),
            })),
        },
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
                    href={`/dashboard/quotes/${quote.id}`}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-semibold">Edit Quote {quote.quoteNumber}</h1>
            </div>

            <QuoteEditForm {...serializedData} />
        </div>
    );
}
