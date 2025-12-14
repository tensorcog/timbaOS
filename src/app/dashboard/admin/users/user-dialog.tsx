"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Plus, X } from "lucide-react";

interface Location {
    id: string;
    name: string;
    code: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    UserLocation: { Location: { name: string; code: string } }[];
}

interface UserDialogProps {
    user?: User;
    locations: Location[];
    trigger?: React.ReactNode;
    onSuccess: () => void;
}

export function UserDialog({ user, locations, trigger, onSuccess }: UserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "SALES",
        isActive: true,
        locationIds: [] as string[]
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: "", // Don't populate password on edit
                role: user.role,
                isActive: user.isActive,
                locationIds: user.UserLocation.map((ul: any) => ul.locationId)
            });
        } else {
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "SALES",
                isActive: true,
                locationIds: []
            });
        }
    }, [user, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = user ? `/api/users/${user.id}` : "/api/users";
            const method = user ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }

            toast.success(user ? "User updated successfully" : "User created successfully");
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const toggleLocation = (locationId: string) => {
        setFormData(prev => {
            const current = prev.locationIds;
            if (current.includes(locationId)) {
                return { ...prev, locationIds: current.filter(id => id !== locationId) };
            } else {
                return { ...prev, locationIds: [...current, locationId] };
            }
        });
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>
                {trigger || (
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-600 to-orange-700 text-white hover:from-amber-700 hover:to-orange-800 h-10 px-4 py-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Employee
                    </button>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg border bg-card text-card-foreground">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold leading-none tracking-tight">
                                    {user ? "Edit Employee" : "Add New Employee"}
                                </h3>
                                <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 pt-0">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
                                    <input
                                        id="name"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {user ? "New Password (leave blank to keep current)" : "Password"}
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required={!user}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="role" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Role</label>
                                    <select
                                        id="role"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="SALES">Sales Representative</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="WAREHOUSE">Warehouse Staff</option>
                                        <option value="LOCATION_ADMIN">Location Admin</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Assigned Locations</label>
                                    <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
                                        {locations.map(location => (
                                            <div key={location.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`loc-${location.id}`}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={formData.locationIds.includes(location.id)}
                                                    onChange={() => toggleLocation(location.id)}
                                                />
                                                <label htmlFor={`loc-${location.id}`} className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {location.name} ({location.code})
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {user && (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Active Account</label>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-600 to-orange-700 text-white hover:from-amber-700 hover:to-orange-800 h-10 px-4 py-2"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {user ? "Save Changes" : "Create Employee"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
