import Link from "next/link";
import { Upload, Database, MapPin, FileSpreadsheet, Download } from "lucide-react";

export default function AdminPage() {
    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Admin Panel
                    </h1>
                    <p className="text-muted-foreground mt-1">System administration and data management</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Locations - Top Left */}
                <Link
                    href="/dashboard/locations"
                    className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-600/10 via-purple-500/5 to-transparent p-6 backdrop-blur hover:from-amber-600/20 hover:via-purple-500/10 transition-all block h-full"
                >
                    <div className="flex items-start justify-between h-full">
                        <div className="flex flex-col h-full">
                            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                                <MapPin className="h-6 w-6 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Locations</h3>
                            <p className="text-sm text-muted-foreground flex-1">
                                Manage store locations, warehouses, and distribution centers
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Export Data - Top Right */}
                <Link
                    href="/dashboard/admin/export"
                    className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 backdrop-blur hover:from-green-500/20 hover:via-green-500/10 transition-all block h-full"
                >
                    <div className="flex items-start justify-between h-full">
                        <div className="flex flex-col h-full">
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                <Download className="h-6 w-6 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Export Data</h3>
                            <p className="text-sm text-muted-foreground flex-1">
                                Export products, customers, and orders to CSV or Excel files
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Database Tools - Bottom Left */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 backdrop-blur opacity-50 h-full">
                    <div className="flex items-start justify-between h-full">
                        <div className="flex flex-col h-full">
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                <Database className="h-6 w-6 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Database Tools</h3>
                            <p className="text-sm text-muted-foreground flex-1">
                                Backup, restore, and manage database operations
                            </p>
                            <span className="mt-2 inline-block text-xs px-2 py-1 rounded bg-muted w-fit">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* Import Data - Bottom Right */}
                <Link
                    href="/dashboard/admin/import"
                    className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-6 backdrop-blur hover:from-blue-500/20 hover:via-blue-500/10 transition-all block h-full"
                >
                    <div className="flex items-start justify-between h-full">
                        <div className="flex flex-col h-full">
                            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                                <Upload className="h-6 w-6 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Import Data</h3>
                            <p className="text-sm text-muted-foreground flex-1">
                                Import products, customers, and orders from ECI Spruce or CSV files
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="rounded-xl border border-blue-500/50 bg-blue-500/10 p-6">
                <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-blue-400">ECI Spruce Migration</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Migrating from ECI Spruce? Use the Import Data tool to upload your exported customer,
                            product, and order data. The system will automatically map ECI Spruce fields to TimbaOS.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <Link
                                href="/dashboard/admin/import"
                                className="text-sm px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                            >
                                Start Import
                            </Link>
                            <button className="text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                View Documentation
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
