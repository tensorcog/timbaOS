"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package } from "lucide-react"
import { useLocation } from "@/lib/context/location-context"

interface AnalyticsData {
  totalRevenue: number
  completedOrders: number
  pendingOrders: number
  totalOrders: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>
  ordersByStatus: Array<{ status: string; count: number; color: string }>
  categoryBreakdown: Array<{ category: string; revenue: number; count: number }>
  previousMonthRevenue: number
  previousMonthOrders: number
}

interface Location {
  id: string
  name: string
  code: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentLocation } = useLocation()

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<Location[]>([])

  /**
   * Single Source of Truth: URL Search Parameters
   * - 'all' = show all locations
   * - <locationId> = show specific location  
   * - null = show current location from context
   */
  const locationParam = searchParams.get('location')
  const effectiveLocation = locationParam || currentLocation?.id || ''

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('/api/locations')
        if (response.ok) {
          const data = await response.json()
          setLocations(data)
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      }
    }
    fetchLocations()
  }, [])

  /**
   * Fetch analytics data whenever the effective location changes
   * URL parameter takes precedence over context
   */
  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        // Build URL based on location selection
        const url = locationParam === 'all'
          ? '/api/analytics'  // No parameter = all locations for admins
          : effectiveLocation
            ? `/api/analytics?locationId=${effectiveLocation}`
            : '/api/analytics'
        
        const response = await fetch(url)
        const analyticsData = await response.json()
        setData(analyticsData)
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch if we have a location or explicitly showing all
    if (effectiveLocation || locationParam === 'all') {
      fetchAnalytics()
    }
  }, [locationParam, effectiveLocation])

  /**
   * Handle location change by updating URL
   * This becomes the single source of truth
   */
  const handleShowAllToggle = () => {
    if (locationParam === 'all') {
      // Switch back to current location
      router.push('/dashboard/analytics')
    } else {
      // Switch to all locations
      router.push('/dashboard/analytics?location=all')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Failed to load analytics</div>
      </div>
    )
  }

  const revenueGrowth = data.previousMonthRevenue > 0
    ? ((data.totalRevenue - data.previousMonthRevenue) / data.previousMonthRevenue) * 100
    : 0

  const ordersGrowth = data.previousMonthOrders > 0
    ? ((data.totalOrders - data.previousMonthOrders) / data.previousMonthOrders) * 100
    : 0

  const CHART_COLORS = {
    primary: "#3b82f6",
    success: "#22c55e",
    warning: "#eab308",
    danger: "#ef4444",
    purple: "#a855f7",
    orange: "#f97316",
  }

  const selectedLocationName = locationParam === 'all'
    ? 'All Locations'
    : locations.find(loc => loc.id === effectiveLocation)?.name || currentLocation?.name || 'Loading...'

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">{selectedLocationName}</p>
        </div>
        <button
          onClick={handleShowAllToggle}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            locationParam === 'all'
              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-primary'
              : 'bg-background hover:bg-muted'
          }`}
        >
          {locationParam === 'all' ? '✓ All Locations' : 'Show All Locations'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold mt-2">${data.totalRevenue.toFixed(2)}</div>
          <div className="flex items-center mt-2 text-sm">
            {revenueGrowth >= 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+{revenueGrowth.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-red-500">{revenueGrowth.toFixed(1)}%</span>
              </>
            )}
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Completed Orders</div>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold mt-2">{data.completedOrders}</div>
          <div className="flex items-center mt-2 text-sm">
            {ordersGrowth >= 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+{ordersGrowth.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-red-500">{ordersGrowth.toFixed(1)}%</span>
              </>
            )}
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold mt-2">{data.pendingOrders}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {data.totalOrders > 0 ? ((data.pendingOrders / data.totalOrders) * 100).toFixed(1) : 0}% of total orders
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--card-foreground))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary }}
              name="Revenue ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Order Status and Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Status Pie Chart */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="font-semibold mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.ordersByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {data.ordersByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="font-semibold mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.categoryBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="revenue" fill={CHART_COLORS.success} name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <h3 className="font-semibold mb-4">Top Selling Products</h3>
          <div className="space-y-4">
            {data.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.quantity} units sold
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold">
                  ${product.revenue.toFixed(2)}
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No product sales data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders by Month Bar Chart */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-4">Orders Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="orders" fill={CHART_COLORS.purple} name="Number of Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
