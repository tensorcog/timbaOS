import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SearchInput } from '@/components/search-input';

export const dynamic = 'force-dynamic';

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: { showAll?: string; q?: string };
}) {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const userRole = session.user.role as UserRole;
    const userLocationIds = session.user.locationIds || [];

    const showAll = searchParams.showAll === 'true';
    const query = searchParams.q;

    // Build location filter based on role and selected location
    const cookieStore = cookies();
    const selectedLocationId = cookieStore.get('locationId')?.value;

    let locationFilter: any = {};

    // If showAll is enabled, show all locations (no filter)
    if (showAll) {
        locationFilter = {};
    } else if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        // Admins can see all, but if they selected a location, filter by it
        if (selectedLocationId) {
            locationFilter = { locationId: selectedLocationId };
        }
    } else {
        // Regular users are restricted to their assigned locations
        if (selectedLocationId && userLocationIds.includes(selectedLocationId)) {
            locationFilter = { locationId: selectedLocationId };
        } else {
            // Fallback to all assigned locations if no selection or invalid selection
            locationFilter = { locationId: { in: userLocationIds } };
        }
    }

    // Sales users only see their own quotes
    const ownershipFilter = userRole === UserRole.SALES
        ? { createdById: session.user.id }
        : {};

    const quotes = await prisma.quote.findMany({
        where: {
            ...locationFilter,
            ...ownershipFilter,
            ...(query
                ? {
                    OR: [
                        { quoteNumber: { contains: query, mode: "insensitive" } },
                        { Customer: { name: { contains: query, mode: "insensitive" } } },
                    ],
                }
                : {}),
        },
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
        orderBy: {
            createdAt: 'desc',
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            case 'SENT':
                return <FileText className="h-4 w-4 text-blue-600" />;
            case 'ACCEPTED':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'REJECTED':
            case 'EXPIRED':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return null;
        }
    };

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

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">Quotes</h1>
                <div className="flex items-center gap-3">
                    <Link
                        href={showAll ? "/dashboard/quotes" : "/dashboard/quotes?showAll=true"}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            showAll
                                ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-500/30 text-primary'
                                : 'bg-background hover:bg-muted'
                        }`}
                    >
                        {showAll ? '✓ All Locations' : 'Show All Locations'}
                    </Link>
                    <Link
                        href="/dashboard/quotes/new"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold hover:from-amber-700 hover:to-orange-800 transition-all flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Quote
                    </Link>
                </div>
            </div>
            {/* Search Bar */}
            <div className="mb-4">
                <SearchInput 
                    placeholder="Search quotes by number or customer..."
                    baseUrl="/dashboard/quotes"
                />
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Quote #</th>
                                    <th className="text-left p-2">Customer</th>
                                    <th className="text-left p-2">Location</th>
                                    <th className="text-left p-2">Status</th>
                                    <th className="text-left p-2">Total</th>
                                    <th className="text-left p-2">Valid Until</th>
                                    <th className="text-left p-2">Created</th>
                                    <th className="text-left p-2">Items</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotes.map((quote) => {
                                    const isExpired = new Date(quote.validUntil) < new Date();
                                    const displayStatus = isExpired && quote.status === 'PENDING' ? 'EXPIRED' : quote.status;

                                    return (
                                        <tr key={quote.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="p-2">
                                                <Link
                                                    href={`/dashboard/quotes/${quote.id}`}
                                                    className="font-mono text-sm text-blue-600 hover:underline"
                                                >
                                                    {quote.quoteNumber}
                                                </Link>
                                            </td>
                                            <td className="p-2">{quote.Customer.name}</td>
                                            <td className="p-2">
                                                <span className="font-mono text-xs">{quote.Location.code}</span>
                                            </td>
                                            <td className="p-2">
                                                <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${getStatusColor(displayStatus)}`}>
                                                    {getStatusIcon(displayStatus)}
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="p-2 font-semibold">
                                                ${Number(quote.totalAmount).toFixed(2)}
                                            </td>
                                            <td className="p-2">
                                                <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                                    {new Date(quote.validUntil).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="p-2 text-sm text-muted-foreground">
                                                {new Date(quote.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-2 text-sm text-muted-foreground">
                                                {quote.QuoteItem.length} items
                                            </td>
                                        </tr>
                                    );
                                })}
                                {quotes.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No quotes yet. Create your first quote to get started.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
