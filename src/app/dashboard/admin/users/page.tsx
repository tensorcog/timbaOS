"use client";

import { useState, useEffect } from "react";
import { UserDialog } from "./user-dialog";
import { Loader2, Search, Edit, Trash2, Shield, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import { useLocation } from "@/lib/context/location-context";
import { useRouter, useSearchParams } from "next/navigation";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    UserLocation: { Location: { name: string; code: string } }[];
}

interface Location {
    id: string;
    name: string;
    code: string;
}

export default function EmployeesPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { currentLocation } = useLocation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const showAll = searchParams.get('showAll') === 'true';

    const fetchData = async () => {
        try {
            const url = showAll ? "/api/users?showAll=true" : "/api/users";
            const [usersRes, locationsRes] = await Promise.all([
                fetch(url),
                fetch("/api/locations")
            ]);

            if (usersRes.ok && locationsRes.ok) {
                const usersData = await usersRes.json();
                const locationsData = await locationsRes.json();
                setUsers(usersData);
                setLocations(locationsData);
            } else {
                toast.error("Failed to fetch data");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading employees");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [showAll]);

    // Refetch when location changes (only if not showing all)
    useEffect(() => {
        if (currentLocation && !showAll) {
            fetchData();
        }
    }, [currentLocation?.id]);

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to deactivate this user?")) return;

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("User deactivated");
                fetchData();
            } else {
                const text = await res.text();
                toast.error(text);
            }
        } catch (error) {
            toast.error("Failed to deactivate user");
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "SUPER_ADMIN": return "bg-red-100 text-red-800 border-red-200";
            case "LOCATION_ADMIN": return "bg-purple-100 text-purple-800 border-purple-200";
            case "MANAGER": return "bg-blue-100 text-blue-800 border-blue-200";
            case "SALES": return "bg-green-100 text-green-800 border-green-200";
            case "WAREHOUSE": return "bg-orange-100 text-orange-800 border-orange-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const toggleShowAll = () => {
        const newShowAll = !showAll;
        const url = newShowAll ? '/dashboard/admin/users?showAll=true' : '/dashboard/admin/users';
        router.push(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Employees
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage system users and access roles</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleShowAll}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            showAll
                                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-primary'
                                : 'bg-background hover:bg-muted'
                        }`}
                    >
                        {showAll ? '✓ All Locations' : 'Show All Locations'}
                    </button>
                    <UserDialog locations={locations} onSuccess={fetchData} />
                </div>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                    />
                </div>
            </div>

            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Locations</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {user.role.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.UserLocation && user.UserLocation.length > 0 ? (
                                                    user.UserLocation.map((ul: any, idx: number) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                                                            <MapPin className="w-3 h-3 mr-1" />
                                                            {ul.Location.code}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">No locations assigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.isActive
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <UserDialog
                                                    user={user}
                                                    locations={locations}
                                                    onSuccess={fetchData}
                                                    trigger={
                                                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-blue-600 hover:text-blue-700">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    }
                                                />
                                                <button
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-red-600 hover:text-red-700"
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
