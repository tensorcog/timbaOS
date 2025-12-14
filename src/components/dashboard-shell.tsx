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
    MessageSquare,
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
                <div className="hidden border-r border-walnut-medium/20 wood-mahogany md:block">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-14 items-center border-b border-walnut-medium/30 px-4 lg:h-[60px] lg:px-6 backdrop-blur">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                {companyLogo ? (
                                    <div className="h-8 w-8 rounded-organic-2 overflow-hidden flex items-center justify-center bg-white shadow-organic">
                                        <img src={companyLogo} alt="Company logo" className="max-h-full max-w-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-organic-2 texture-brass flex items-center justify-center shadow-organic">
                                        <Package2 className="h-5 w-5 text-char" />
                                    </div>
                                )}
                                <span className="text-cream font-display font-bold text-lg">TimbaOS</span>
                            </Link>
                            <button className="ml-auto h-8 w-8 border border-brass/30 rounded-organic-2 flex items-center justify-center hover:bg-brass/10 transition-colors">
                                <Bell className="h-4 w-4 text-brass-bright" />
                                <span className="sr-only">Toggle notifications</span>
                            </button>
                        </div>
                        <div className="flex-1">
                            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                                <Link
                                    href="/dashboard/products"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/products')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <Package className="h-4 w-4" />
                                    Products
                                </Link>
                                <Link
                                    href="/dashboard/orders"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/orders')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Orders
                                </Link>
                                <Link
                                    href="/dashboard/schedule"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/schedule')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Schedule
                                </Link>
                                <Link
                                    href="/dashboard/quotes"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/quotes')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <FileText className="h-4 w-4" />
                                    Quotes
                                </Link>
                                <Link
                                    href="/dashboard/customers"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/customers')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <Users className="h-4 w-4" />
                                    Customers
                                </Link>
                                <Link
                                    href="/dashboard/transfers"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/transfers')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <ArrowLeftRight className="h-4 w-4" />
                                    Transfers
                                </Link>
                                <Link
                                    href="/dashboard/locations"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/locations')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <MapPin className="h-4 w-4" />
                                    Locations
                                </Link>

                                {/* Analytics - Only for admins and managers */}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN' || userRole === 'MANAGER') && (
                                    <Link
                                        href="/dashboard/analytics"
                                        className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                            pathname?.startsWith('/dashboard/analytics')
                                                ? 'texture-brass text-char font-bold shadow-organic'
                                                : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                        }`}
                                    >
                                        <LineChart className="h-4 w-4" />
                                        Analytics
                                    </Link>
                                )}
                                <Link
                                    href="/dashboard"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname === '/dashboard'
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <Home className="h-4 w-4" />
                                    Dashboard
                                </Link>

                                <div className="my-2 border-t border-walnut-medium/30" />

                                {/* Admin - Only for admins */}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN') && (
                                    <Link
                                        href="/dashboard/admin"
                                        className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                            pathname === '/dashboard/admin'
                                                ? 'texture-brass text-char font-bold shadow-organic'
                                                : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                        }`}
                                    >
                                        <Settings className="h-4 w-4" />
                                        Admin
                                    </Link>
                                )}
                                {(userRole === 'SUPER_ADMIN' || userRole === 'LOCATION_ADMIN') && (
                                    <Link
                                        href="/dashboard/admin/users"
                                        className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                            pathname?.startsWith('/dashboard/admin/users')
                                                ? 'texture-brass text-char font-bold shadow-organic'
                                                : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                        }`}
                                    >
                                        <Users className="h-4 w-4" />
                                        Employees
                                    </Link>
                                )}
                                <Link
                                    href="/dashboard/chat"
                                    className={`flex items-center gap-3 rounded-organic-2 px-3 py-2 transition-all ${
                                        pathname?.startsWith('/dashboard/chat')
                                            ? 'texture-brass text-char font-bold shadow-organic'
                                            : 'text-cream/80 hover:text-cream hover:bg-mahogany-rich/50'
                                    }`}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    AI Chat
                                </Link>
                            </nav>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col wood-oak">
                    <header className="flex h-14 items-center gap-4 border-b border-walnut-medium/20 bg-white/60 backdrop-blur px-4 lg:h-[60px] lg:px-6 overflow-visible shadow-organic">
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
