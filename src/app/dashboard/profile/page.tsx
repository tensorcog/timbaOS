"use client";

import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar, MapPin, Pencil, Upload, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    profilePicture?: string | null;
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

interface UserPreferences {
    theme: string;
    customTheme?: any;
    emailNotifications: boolean;
}

const COLOR_SCHEMES = [
    { name: 'Purple & Blue (Default)', value: 'default', colors: { primary: '#9333ea', secondary: '#3b82f6' } },
    { name: 'Ocean', value: 'ocean', colors: { primary: '#0891b2', secondary: '#06b6d4' } },
    { name: 'Forest', value: 'forest', colors: { primary: '#059669', secondary: '#10b981' } },
    { name: 'Sunset', value: 'sunset', colors: { primary: '#ea580c', secondary: '#f59e0b' } },
    { name: 'Rose', value: 'rose', colors: { primary: '#e11d48', secondary: '#f43f5e' } },
    { name: 'Violet', value: 'violet', colors: { primary: '#7c3aed', secondary: '#a78bfa' } },
];

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [selectedColorScheme, setSelectedColorScheme] = useState('default');

    useEffect(() => {
        loadProfile();
        loadPreferences();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await fetch('/api/users/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditName(data.name);
                if (data.profilePicture) {
                    setProfilePicturePreview(data.profilePicture);
                }
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadPreferences = async () => {
        try {
            const response = await fetch('/api/users/preferences');
            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
                setSelectedColorScheme(data.theme?.toLowerCase() || 'default');
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    };

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadProfilePicture = async () => {
        if (!profilePictureFile) return;

        try {
            const formData = new FormData();
            formData.append('profilePicture', profilePictureFile);

            const response = await fetch('/api/upload/profile-picture', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }

            toast.success('Profile picture updated successfully');
            setProfilePictureFile(null);
            await loadProfile();
        } catch (error: any) {
            console.error('Failed to upload profile picture:', error);
            toast.error(error.message || 'Failed to upload profile picture');
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
                toast.success('Profile updated successfully');
            } else {
                const error = await response.json();
                setErrorMessage(error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            setErrorMessage('Failed to save profile');
        }
    };

    const handleColorSchemeChange = async (scheme: string) => {
        setSelectedColorScheme(scheme);
        
        try {
            const response = await fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: scheme.toUpperCase() }),
            });

            if (response.ok) {
                toast.success('Color scheme updated');
                // Reload page to apply new theme
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to update color scheme:', error);
            toast.error('Failed to update color scheme');
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-700 bg-clip-text text-transparent">
                    Profile
                </h1>
            </div>

            {/* Profile Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-amber-600/20 to-orange-600/20" />
                <div className="p-6 -mt-12">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {profilePicturePreview ? (
                                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-card bg-muted">
                                    <img src={profilePicturePreview} alt={profile.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-card">
                                    {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                </div>
                            )}
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

            {/* Profile Picture Upload */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Upload className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="text-lg font-semibold">Profile Picture</h3>
                        <p className="text-sm text-muted-foreground">
                            Upload a profile picture (PNG or JPG, max 5MB)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Choose File
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                        />
                    </label>
                    {profilePictureFile && (
                        <>
                            <span className="text-sm text-muted-foreground">{profilePictureFile.name}</span>
                            <button
                                onClick={handleUploadProfilePicture}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Upload
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Color Scheme Selector */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Palette className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="text-lg font-semibold">Color Scheme</h3>
                        <p className="text-sm text-muted-foreground">
                            Choose your preferred color scheme
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COLOR_SCHEMES.map((scheme) => (
                        <button
                            key={scheme.value}
                            onClick={() => handleColorSchemeChange(scheme.value)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                selectedColorScheme === scheme.value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="h-6 w-6 rounded-full"
                                    style={{ background: `linear-gradient(135deg, ${scheme.colors.primary}, ${scheme.colors.secondary})` }}
                                />
                                <span className="font-medium text-sm">{scheme.name}</span>
                            </div>
                        </button>
                    ))}
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
