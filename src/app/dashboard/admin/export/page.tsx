"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, CheckCircle2, ArrowRight, Users, Package, ShoppingCart, Calendar, Filter } from "lucide-react"

type ExportType = "products" | "customers" | "orders" | null
type ExportFormat = "csv" | "xlsx" | null
type DateRange = "all" | "today" | "week" | "month" | "quarter" | "year" | "custom"

interface ExportFilters {
  dateRange: DateRange
  customStartDate?: string
  customEndDate?: string
  locationId?: string
  category?: string
  status?: string
}

export default function ExportPage() {
  const [step, setStep] = useState(1)
  const [exportType, setExportType] = useState<ExportType>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>(null)
  const [filters, setFilters] = useState<ExportFilters>({ dateRange: "all" })
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Call the export API
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: exportType,
          format: exportFormat,
          filters: filters,
        }),
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Get the blob from the response
      const blob = await response.blob()
      const filename = `${exportType}_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setIsExporting(false)
      setExportComplete(true)
      setStep(4)
    } catch (error) {
      console.error("Export error:", error)
      setIsExporting(false)
      alert("Failed to export data. Please try again.")
    }
  }

  const resetExport = () => {
    setStep(1)
    setExportType(null)
    setExportFormat(null)
    setFilters({ dateRange: "all" })
    setIsExporting(false)
    setExportComplete(false)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Export Data
          </h1>
          <p className="text-muted-foreground mt-1">Export your products, customers, and orders to CSV or Excel files</p>
        </div>
        {step > 1 && (
          <button
            onClick={resetExport}
            className="text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Progress Steps */}
      {step > 1 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step
                      ? "bg-blue-500 text-white"
                      : s < step
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-0.5 ${
                      s < step ? "bg-green-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="rounded-xl border bg-card p-6">
          {/* Step 1: Select Export Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">What would you like to export?</h2>
                <p className="text-sm text-muted-foreground">Choose the type of data to export</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Products Export */}
                <button
                  onClick={() => {
                    setExportType("products")
                    setStep(2)
                  }}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-6 backdrop-blur hover:from-blue-500/20 hover:via-blue-500/10 transition-all text-left"
                >
                  <div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <Package className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Products</h3>
                    <p className="text-sm text-muted-foreground">
                      Export product catalog including SKUs, pricing, inventory, and categories
                    </p>
                  </div>
                </button>

                {/* Customers Export */}
                <button
                  onClick={() => {
                    setExportType("customers")
                    setStep(2)
                  }}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-6 backdrop-blur hover:from-purple-500/20 hover:via-purple-500/10 transition-all text-left"
                >
                  <div>
                    <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Customers</h3>
                    <p className="text-sm text-muted-foreground">
                      Export customer database with contact info, account details, and loyalty data
                    </p>
                  </div>
                </button>

                {/* Orders Export */}
                <button
                  onClick={() => {
                    setExportType("orders")
                    setStep(2)
                  }}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 backdrop-blur hover:from-green-500/20 hover:via-green-500/10 transition-all text-left"
                >
                  <div>
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <ShoppingCart className="h-6 w-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Orders</h3>
                    <p className="text-sm text-muted-foreground">
                      Export order history with line items, payments, and fulfillment status
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Format & Filters */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Configure Export</h2>
                <p className="text-sm text-muted-foreground">Choose format and apply filters</p>
              </div>

              {/* Format Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold">Export Format</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      exportFormat === "csv"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                    <div className="text-left">
                      <div className="font-semibold">CSV</div>
                      <div className="text-xs text-muted-foreground">Comma-separated values</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setExportFormat("xlsx")}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      exportFormat === "xlsx"
                        ? "border-green-500 bg-green-500/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <FileSpreadsheet className="w-8 h-8 text-green-400" />
                    <div className="text-left">
                      <div className="font-semibold">Excel</div>
                      <div className="text-xs text-muted-foreground">Microsoft Excel format</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-5 h-5" />
                  <h3 className="font-semibold">Filters</h3>
                </div>

                {/* Date Range for Orders */}
                {exportType === "orders" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as DateRange })}
                      className="w-full px-4 py-2 border bg-background rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="quarter">Last Quarter</option>
                      <option value="year">Last Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {filters.dateRange === "custom" && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                          <input
                            type="date"
                            onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                            className="w-full px-3 py-2 border bg-background rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                          <input
                            type="date"
                            onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                            className="w-full px-3 py-2 border bg-background rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Filter for Products */}
                {exportType === "products" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Category</label>
                    <select
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-4 py-2 border bg-background rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      <option value="lumber">Lumber</option>
                      <option value="plywood">Plywood</option>
                      <option value="hardware">Hardware</option>
                      <option value="concrete">Concrete</option>
                    </select>
                  </div>
                )}

                {/* Status Filter for Orders */}
                {exportType === "orders" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Order Status</label>
                    <select
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-4 py-2 border bg-background rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="READY">Ready for Pickup</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!exportFormat}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    exportFormat
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Review Export Settings</h2>
                <p className="text-sm text-muted-foreground">Confirm your export configuration before proceeding</p>
              </div>

              <div className="space-y-4 p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Export Type</div>
                    <div className="text-lg font-bold capitalize">{exportType}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Format</div>
                    <div className="text-lg font-bold uppercase">{exportFormat}</div>
                  </div>
                </div>

                {Object.keys(filters).filter(key => filters[key as keyof ExportFilters] && filters[key as keyof ExportFilters] !== "all").length > 0 && (
                  <div className="pt-4 border-t border-blue-500/20">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Active Filters</div>
                    <div className="flex flex-wrap gap-2">
                      {filters.dateRange !== "all" && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                          Date: {filters.dateRange}
                        </span>
                      )}
                      {filters.category && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium capitalize">
                          Category: {filters.category}
                        </span>
                      )}
                      {filters.status && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                          Status: {filters.status}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Export will include:</strong> All {exportType} data matching your filters. Large exports may take a few moments to process.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isExporting
                      ? "bg-muted text-muted-foreground cursor-wait"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Start Export
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && exportComplete && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Export Complete!</h2>
                <p className="text-muted-foreground">Your file has been generated and downloaded</p>
              </div>

              <div className="p-6 bg-green-500/10 rounded-lg border border-green-500/20 inline-block">
                <div className="flex items-center gap-3 text-left">
                  <FileSpreadsheet className="w-10 h-10 text-green-400" />
                  <div>
                    <div className="font-semibold">
                      {exportType}_export_{new Date().toISOString().split('T')[0]}.{exportFormat}
                    </div>
                    <div className="text-sm text-muted-foreground">Downloaded to your device</div>
                  </div>
                </div>
              </div>

              <button
                onClick={resetExport}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
              >
                Export More Data
              </button>
            </div>
          )}
        </div>

      {/* Footer Help Text */}
      {step < 4 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need help? Exports include all visible columns and can be opened in Excel, Google Sheets, or any spreadsheet application.
        </div>
      )}
    </>
  )
}
