"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, MapPin, AlertCircle, CheckCircle2, ArrowRight, Package, Users, ShoppingCart } from "lucide-react";

type ImportType = "products" | "customers" | "orders" | null;
type ImportStep = "select" | "upload" | "map" | "preview" | "import";

export default function ImportPage() {
    const [importType, setImportType] = useState<ImportType>(null);
    const [step, setStep] = useState<ImportStep>("select");
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const resetImport = () => {
        setImportType(null);
        setStep("select");
        setFile(null);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Import Data
                    </h1>
                    <p className="text-muted-foreground mt-1">Import data from ECI Spruce or CSV files</p>
                </div>
                {step !== "select" && (
                    <button
                        onClick={resetImport}
                        className="text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                        Start Over
                    </button>
                )}
            </div>

            {/* Progress Steps */}
            {step !== "select" && (
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                        {["upload", "map", "preview", "import"].map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    step === s ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                    {i + 1}
                                </div>
                                <span className={`text-sm font-medium ${
                                    step === s ? "text-foreground" : "text-muted-foreground"
                                }`}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </span>
                                {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 1: Select Import Type */}
            {step === "select" && (
                <div className="grid gap-4 md:grid-cols-3">
                    <button
                        onClick={() => {
                            setImportType("products");
                            setStep("upload");
                        }}
                        className="group text-left relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-6 backdrop-blur hover:from-blue-500/20 hover:via-blue-500/10 transition-all"
                    >
                        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                            <Package className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Products</h3>
                        <p className="text-sm text-muted-foreground">
                            Import product catalog with SKUs, prices, and categories
                        </p>
                    </button>

                    <button
                        onClick={() => {
                            setImportType("customers");
                            setStep("upload");
                        }}
                        className="group text-left relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-6 backdrop-blur hover:from-purple-500/20 hover:via-purple-500/10 transition-all"
                    >
                        <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Customers</h3>
                        <p className="text-sm text-muted-foreground">
                            Import customer data including contacts and addresses
                        </p>
                    </button>

                    <button
                        onClick={() => {
                            setImportType("orders");
                            setStep("upload");
                        }}
                        className="group text-left relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 backdrop-blur hover:from-green-500/20 hover:via-green-500/10 transition-all"
                    >
                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                            <ShoppingCart className="h-6 w-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Orders</h3>
                        <p className="text-sm text-muted-foreground">
                            Import historical order data with line items
                        </p>
                    </button>
                </div>
            )}

            {/* Step 2: Upload File */}
            {step === "upload" && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Upload {importType?.charAt(0).toUpperCase()}{importType?.slice(1)} Data
                    </h2>

                    <div className="border-2 border-dashed rounded-lg p-12 text-center">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Drop your file here or click to browse</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Supports CSV, Excel (.xlsx, .xls) - Max 10MB
                        </p>
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                            Select File
                        </label>
                    </div>

                    {file && (
                        <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep("map")}
                                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-yellow-400">ECI Spruce Export Format</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Export your data from ECI Spruce to Excel format. The importer will automatically
                                    detect and map ECI Spruce column names to Pine ERP fields.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Map Columns */}
            {step === "map" && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Map Columns</h2>
                    <p className="text-muted-foreground mb-6">
                        Map your file columns to Pine ERP fields. Automatic mapping has been applied based on column names.
                    </p>

                    <div className="space-y-3">
                        {importType === "products" && (
                            <>
                                <ColumnMapping source="Product Name" target="name" auto />
                                <ColumnMapping source="SKU" target="sku" auto />
                                <ColumnMapping source="Price" target="basePrice" auto />
                                <ColumnMapping source="Category" target="category" auto />
                                <ColumnMapping source="Description" target="description" auto />
                            </>
                        )}
                        {importType === "customers" && (
                            <>
                                <ColumnMapping source="Customer Name" target="name" auto />
                                <ColumnMapping source="Email" target="email" auto />
                                <ColumnMapping source="Phone" target="phone" auto />
                                <ColumnMapping source="Address" target="address" auto />
                            </>
                        )}
                    </div>

                    <div className="mt-6 rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-blue-400">Location Assignment</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Products will be added to inventory for all active locations by default.
                                    You can customize inventory levels per location after import.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setStep("preview")}
                            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                            Preview Import
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Preview */}
            {step === "preview" && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Preview Import</h2>
                    <p className="text-muted-foreground mb-6">
                        Review the data before importing. The first 10 rows are shown below.
                    </p>

                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-3 text-sm font-medium">#</th>
                                    <th className="text-left p-3 text-sm font-medium">Name</th>
                                    <th className="text-left p-3 text-sm font-medium">SKU</th>
                                    <th className="text-left p-3 text-sm font-medium">Price</th>
                                    <th className="text-left p-3 text-sm font-medium">Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td className="p-3 text-sm">1</td>
                                    <td className="p-3 text-sm">Sample Product</td>
                                    <td className="p-3 text-sm font-mono">SKU-001</td>
                                    <td className="p-3 text-sm">$19.99</td>
                                    <td className="p-3 text-sm">Category A</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span>Ready to import 150 rows</span>
                        </div>
                        <button
                            onClick={() => setStep("import")}
                            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                            Start Import
                        </button>
                    </div>
                </div>
            )}

            {/* Step 5: Import Progress */}
            {step === "import" && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Importing Data</h2>

                    <div className="space-y-4">
                        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                <p className="text-sm">Import completed successfully!</p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <p className="text-sm text-muted-foreground">Total Rows</p>
                                <p className="text-2xl font-bold">150</p>
                            </div>
                            <div className="rounded-lg border bg-green-500/10 p-4">
                                <p className="text-sm text-muted-foreground">Imported</p>
                                <p className="text-2xl font-bold text-green-400">148</p>
                            </div>
                            <div className="rounded-lg border bg-red-500/10 p-4">
                                <p className="text-sm text-muted-foreground">Failed</p>
                                <p className="text-2xl font-bold text-red-400">2</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={resetImport}
                                className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                                Import More Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ColumnMapping({ source, target, auto }: { source: string; target: string; auto?: boolean }) {
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50">
            <div className="flex-1">
                <p className="text-sm font-medium">{source}</p>
                <p className="text-xs text-muted-foreground">Source Column</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
                <p className="text-sm font-medium">{target}</p>
                <p className="text-xs text-muted-foreground">Pine ERP Field</p>
            </div>
            {auto && (
                <div className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                    Auto-mapped
                </div>
            )}
        </div>
    );
}
