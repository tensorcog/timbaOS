import prisma from "@/lib/prisma";
import { ProductList } from "@/components/product-list";

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        include: {
            inventory: {
                include: {
                    location: true,
                }
            }
        },
        orderBy: {
            category: 'asc',
        },
    });

    // Serialize the data for client component
    const serializedProducts = products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        basePrice: parseFloat(product.basePrice.toString()),
        inventory: product.inventory.map(inv => ({
            id: inv.id,
            stockLevel: inv.stockLevel,
            location: {
                code: inv.location.code,
                name: inv.location.name,
            },
        })),
    }));

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <ProductList products={serializedProducts} />
                </div>
            </div>
        </>
    );
}
