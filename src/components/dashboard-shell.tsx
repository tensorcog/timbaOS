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
} from "lucide-react"
import { LocationSelector } from "./location-selector"
import { LocationProvider } from "@/lib/context/location-context"

export function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <LocationProvider>
            <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r border-border bg-card md:block">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                    <Package2 className="h-5 w-5 text-white" />
                                </div>
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
                                    className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-3 py-2 text-primary transition-all hover:from-purple-500/30 hover:to-blue-500/30"
                                >
                                    <Home className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <Link
                                    href="/dashboard/orders"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Orders
                                </Link>
                                <Link
                                    href="/dashboard/products"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <Package className="h-4 w-4" />
                                    Products
                                </Link>
                                <Link
                                    href="/dashboard/customers"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <Users className="h-4 w-4" />
                                    Customers
                                </Link>
                                <Link
                                    href="/dashboard/transfers"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <ArrowLeftRight className="h-4 w-4" />
                                    Transfers
                                </Link>
                                <Link
                                    href="/dashboard/analytics"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <LineChart className="h-4 w-4" />
                                    Analytics
                                </Link>

                                <div className="my-2 border-t border-border" />

                                <Link
                                    href="/dashboard/admin"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                                >
                                    <Settings className="h-4 w-4" />
                                    Admin
                                </Link>
                            </nav>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <header className="flex h-14 items-center gap-4 border-b border-border bg-card/50 backdrop-blur px-4 lg:h-[60px] lg:px-6">
                        <div className="w-full flex-1">
                            <form>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="search"
                                        placeholder="Search products..."
                                        className="w-full appearance-none bg-muted border border-border rounded-lg pl-8 h-9 shadow-none md:w-2/3 lg:w-1/3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </form>
                        </div>
                        <LocationSelector />
                        <button className="rounded-full border border-border w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                            <CircleUser className="h-5 w-5" />
                            <span className="sr-only">Toggle user menu</span>
                        </button>
                    </header>
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </LocationProvider>
    )
}
