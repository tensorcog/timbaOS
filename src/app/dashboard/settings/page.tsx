"use client";

import { ThemeSwitcher } from '@/components/theme-switcher';
import { Palette, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const response = await fetch('/api/users/preferences');
            if (response.ok) {
                const data = await response.json();
                setEmailNotifications(data.emailNotifications);
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationToggle = async () => {
        const newValue = !emailNotifications;
        setEmailNotifications(newValue);

        try {
            await fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emailNotifications: newValue }),
            });
        } catch (error) {
            console.error('Failed to save preference:', error);
            // Revert on error
            setEmailNotifications(!newValue);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-700 bg-clip-text text-transparent">
                    Preferences
                </h1>
                <p className="text-muted-foreground mt-2">
                    Customize your timbaOS experience
                </p>
            </div>

            {/* Theme Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Palette className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Color Scheme</h2>
                        <p className="text-sm text-muted-foreground">
                            Choose your preferred color theme
                        </p>
                    </div>
                </div>
                <ThemeSwitcher />
            </div>

            {/* Notification Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Bell className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Notifications</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage your notification preferences
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-12 bg-muted animate-pulse rounded" />
                ) : (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">
                                Receive updates about orders, transfers, and system events
                            </p>
                        </div>
                        <button
                            onClick={handleNotificationToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifications ? 'bg-primary' : 'bg-border'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                )}
            </div>

            {/* Future Settings Placeholder */}
            <div className="bg-card border border-border rounded-lg p-6 border-dashed">
                <p className="text-muted-foreground text-center py-4">
                    More preferences coming soon...
                </p>
            </div>
        </div>
    );
}
