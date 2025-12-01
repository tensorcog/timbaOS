"use client";

import Link from "next/link"
import {
    Bell,
    CircleUser,
    Home,
    LineChart,
    Menu,
    Package,
    Package2,
    Search,
    ShoppingCart,
    Users,
    ArrowLeftRight,
    Settings,
    FileText,
    MapPin,
    Calendar,
} from "lucide-react"
import { LocationSelector } from "./location-selector"
import { GlobalSearch } from "./global-search"
import { UserMenu } from "./user-menu"
import { LocationProvider, useLocation } from "@/lib/context/location-context"
import { CartProvider } from "@/lib/context/cart-context"
import { CartButton } from "./cart-button"
import { CartSidebar } from "./cart-sidebar"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

function DashboardContent({ children, session }: { children: React.ReactNode; session: any }) {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const pathname = usePathname();
    const userRole = session?.user?.role || 'SALES';

    useEffect(() => {
        // Fetch company logo
        fetch('/api/company-settings')
            .then(res => res.json())
            .then(data => {
                if (data?.logo) {
                    setCompanyLogo(data.logo);
                }
            })
            .catch(err => console.error('Failed to load company logo:', err));
    }, []);

    return (
        <>
            <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r border-border bg-card md:block">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                {companyLogo ? (
                                    <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                                        <img src={companyLogo} alt="Company logo" className="max-h-full max-w-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                        <Package2 className="h-5 w-5 text-white" />
                                    </div>
                                )}
                                <span className="bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent font-bold">Pine ERP</span>
                            </Link>
                            <button className="ml-auto h-8 w-8 border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <Bell className="h-4 w-4" />
                                <span className="sr-only">Toggle notifications</span>
                            </button>
                        </div>
                        <div className="flex-1">
                            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                                <Link
                                    href="/dashboard"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname === '/dashboard'
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Home className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <Link
                                    href="/dashboard/orders"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/orders')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Orders
                                </Link>
                                <Link
                                    href="/dashboard/schedule"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/schedule')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Schedule
                                </Link>
                                <Link
                                    href="/dashboard/quotes"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/quotes')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <FileText className="h-4 w-4" />
                                    Quotes
                                </Link>
                                <Link
                                    href="/dashboard/products"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/products')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Package className="h-4 w-4" />
                                    Products
                                </Link>
                                <Link
                                    href="/dashboard/customers"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/customers')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Users className="h-4 w-4" />
                                    Customers
                                </Link>
                                <Link
                                    href="/dashboard/transfers"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/transfers')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <ArrowLeftRight className="h-4 w-4" />
                                    Transfers
                                </Link>
                                <Link
                                    href="/dashboard/locations"
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/locations')
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <MapPin className="h-4 w-4" />
                                    Locations
                                </Link>
                                {/* Analytics - Only for admins and managers */}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN' || userRole === 'MANAGER') && (
                                    <Link
                                        href="/dashboard/analytics"
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                            pathname?.startsWith('/dashboard/analytics')
                                                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <LineChart className="h-4 w-4" />
                                        Analytics
                                    </Link>
                                )}

                                <div className="my-2 border-t border-border" />

                                {/* Admin - Only for admins */}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN') && (
                                    <Link
                                        href="/dashboard/admin"
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                            pathname === '/dashboard/admin'
                                                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <Settings className="h-4 w-4" />
                                        Admin
                                    </Link>
                                )}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN') && (
                                    <Link
                                        href="/dashboard/admin/users"
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                            pathname?.startsWith('/dashboard/admin/users')
                                                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <Users className="h-4 w-4" />
                                        Employees
                                    </Link>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <header className="flex h-14 items-center gap-4 border-b border-border bg-card/50 backdrop-blur px-4 lg:h-[60px] lg:px-6 overflow-visible">
                        <div className="flex-1" />
                        <LocationSelector />
                        <CartButton onClick={() => setIsCartOpen(true)} />
                        <UserMenu />
                    </header>
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>

            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
            />
        </>
    );
}

export function DashboardShell({ children, session }: { children: React.ReactNode; session: any }) {
    return (
        <LocationProvider>
            <CartProvider>
                <DashboardContent session={session}>{children}</DashboardContent>
            </CartProvider>
        </LocationProvider>
    );
}
