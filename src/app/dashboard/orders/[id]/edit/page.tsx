import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { OrderEditForm } from '@/components/orders/order-edit-form';

interface EditOrderPageProps {
    params: {
        id: string;
    };
}

export default async function EditOrderPage({ params }: EditOrderPageProps) {
    const [order, customers, products, locations] = await Promise.all([
        prisma.order.findUnique({
            where: { id: params.id },
            include: {
                OrderItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: true,
                Location: true,
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

    if (!order) {
        notFound();
    }

    // Only allow editing PENDING orders
    if (order.status !== 'PENDING') {
        redirect(`/dashboard/orders/${order.id}`);
    }

    // Serialize for client component
    const serializedData = {
        order: {
            id: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            locationId: order.locationId,
            deliveryAddress: order.deliveryAddress,
            items: order.OrderItem.map(item => ({
                id: item.id,
                productId: item.productId,
                product: {
                    id: item.Product.id,
                    name: item.Product.name,
                    sku: item.Product.sku,
                    basePrice: parseFloat(item.Product.basePrice.toString()),
                    category: item.Product.category,
                },
                quantity: item.quantity,
                price: parseFloat(item.price.toString()),
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
                    href={`/dashboard/orders/${order.id}`}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-semibold">Edit Order {order.orderNumber}</h1>
            </div>

            <OrderEditForm {...serializedData} />
        </div>
    );
}
