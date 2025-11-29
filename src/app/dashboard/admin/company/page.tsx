"use client";

import { useEffect, useState } from 'react';
import { Building2, Upload, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanySettings {
    id?: string;
    companyName: string;
    logo?: string | null;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    website?: string;
}

export default function CompanySettingsPage() {
    const [settings, setSettings] = useState<CompanySettings>({
        companyName: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/company-settings');
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setSettings(data);
                    if (data.logo) {
                        setLogoPreview(data.logo);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load company settings:', error);
            toast.error('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Upload logo if changed
            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);

                const uploadResponse = await fetch('/api/upload/company-logo', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload logo');
                }

                const { logo } = await uploadResponse.json();
                settings.logo = logo;
            }

            // Save company settings
            const response = await fetch('/api/company-settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            toast.success('Company settings saved successfully');
            setLogoFile(null);
            await loadSettings();
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
                        Company Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your company information and branding
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Logo Upload */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Company Logo</h2>
                        <p className="text-sm text-muted-foreground">
                            Upload your company logo (PNG or JPG, max 5MB)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {logoPreview && (
                        <div className="h-32 w-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                            <img
                                src={logoPreview}
                                alt="Company logo"
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}
                    <div>
                        <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Choose File
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                        </label>
                        {logoFile && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Selected: {logoFile.name}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Company Information */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Company Information</h2>
                        <p className="text-sm text-muted-foreground">
                            Basic information about your company
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Company Name *
                        </label>
                        <input
                            type="text"
                            value={settings.companyName}
                            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="Pine ERP"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={settings.email || ''}
                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="contact@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={settings.phone || ''}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="(555) 123-4567"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Website
                        </label>
                        <input
                            type="url"
                            value={settings.website || ''}
                            onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="https://company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Tax ID
                        </label>
                        <input
                            type="text"
                            value={settings.taxId || ''}
                            onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="XX-XXXXXXX"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                            Address
                        </label>
                        <textarea
                            value={settings.address || ''}
                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            rows={3}
                            placeholder="123 Main St, City, State 12345"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
