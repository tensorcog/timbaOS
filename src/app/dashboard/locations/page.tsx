import prisma from "@/lib/prisma";
import { MapPin, Phone, User, Building, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function LocationsPage() {
    const locations = await prisma.location.findMany({
        include: {
            User: {
                select: {
                    name: true,
                    email: true,
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Locations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your stores and warehouses across the region
                    </p>
                </div>
                <Link
                    href="/dashboard/locations/new"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                    Add Location
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                    <div
                        key={location.id}
                        className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg hover:border-primary/20"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-colors">
                                    <Building className="h-5 w-5 text-blue-500" />
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${location.isWarehouse
                                    ? "bg-purple-500/10 text-purple-500"
                                    : "bg-blue-500/10 text-blue-500"
                                    }`}>
                                    {location.isWarehouse ? "Warehouse" : "Store"}
                                </span>
                            </div>

                            <h3 className="font-semibold text-xl mb-1">{location.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4 font-mono">{location.code}</p>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <span className="text-muted-foreground">{location.address}</span>
                                </div>
                                {location.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">{location.phone}</span>
                                    </div>
                                )}
                                {location.User && (
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">
                                            Mgr: {location.User.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-muted/50 p-4 flex items-center justify-between border-t border-border group-hover:bg-muted/80 transition-colors">
                            <span className={`text-xs font-medium ${location.isActive ? "text-green-500" : "text-red-500"}`}>
                                {location.isActive ? "● Active" : "● Inactive"}
                            </span>
                            <Link
                                href={`/dashboard/locations/${location.id}`}
                                className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                            >
                                View Details
                                <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
