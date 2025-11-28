"use client";

import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar, MapPin, Pencil } from 'lucide-react';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    isActive: boolean;
    UserLocation: Array<{
        Location: {
            id: string;
            code: string;
            name: string;
        };
    }>;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await fetch('/api/users/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditName(data.name);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setErrorMessage('');
            const response = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: editName }),
            });

            if (response.ok) {
                await loadProfile();
                setIsEditing(false);
            } else {
                const error = await response.json();
                setErrorMessage(error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            setErrorMessage('Failed to save profile');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load profile</p>
            </div>
        );
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatRole = (role: string) => {
        return role.split('_').map(word =>
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
                    Profile
                </h1>
            </div>

            {/* Profile Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20" />
                <div className="p-6 -mt-12">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-card">
                                {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                            <div className="mt-8">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="text-2xl font-bold bg-background border border-border rounded px-2 py-1"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                                )}
                                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                    <Shield className="h-4 w-4" />
                                    {formatRole(profile.role)}
                                </p>
                            </div>
                        </div>
                        {isEditing ? (
                            <div className="flex gap-2 mt-8">
                                <button
                                    onClick={handleSaveProfile}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditName(profile.name);
                                        setErrorMessage('');
                                    }}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors mt-8"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{profile.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Member Since</p>
                                <p className="font-medium">{formatDate(profile.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assigned Locations */}
                <div className="bg-card border border-border rounded-lg p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Assigned Locations
                    </h3>
                    {profile.UserLocation.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {profile.UserLocation.map((ul) => (
                                <div
                                    key={ul.Location.id}
                                    className="p-3 bg-muted rounded-lg"
                                >
                                    <p className="font-medium">{ul.Location.name}</p>
                                    <p className="text-sm text-muted-foreground">{ul.Location.code}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Access to all locations</p>
                    )}
                </div>
            </div>
        </div>
    );
}
