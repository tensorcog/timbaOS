import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfMonth, subMonths, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    // Fetch all orders with related data
    const orders = await prisma.order.findMany({
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
      },
    })

    // Calculate basic metrics
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length
    const totalOrders = orders.length

    // Calculate previous month metrics for growth percentages
    const oneMonthAgo = subMonths(new Date(), 1)
    const previousMonthOrders = orders.filter(o => new Date(o.createdAt) < oneMonthAgo)
    const previousMonthRevenue = previousMonthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const previousMonthOrderCount = previousMonthOrders.length

    // Top selling products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}

    orders.forEach(order => {
      order.OrderItem.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.Product.name,
            quantity: 0,
            revenue: 0,
          }
        }
        productSales[item.productId].quantity += item.quantity
        productSales[item.productId].revenue += Number(item.price) * item.quantity
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Revenue by month (last 6 months)
    const revenueByMonth: Array<{ month: string; revenue: number; orders: number }> = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = i === 0 ? new Date() : startOfMonth(subMonths(new Date(), i - 1))

      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= monthStart && orderDate < monthEnd
      })

      const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

      revenueByMonth.push({
        month: format(monthDate, 'MMM yyyy'),
        revenue: Math.round(monthRevenue * 100) / 100,
        orders: monthOrders.length,
      })
    }

    // Order status breakdown
    const statusCounts: Record<string, number> = {}
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
    })

    const statusColors: Record<string, string> = {
      PENDING: '#eab308',
      CONFIRMED: '#3b82f6',
      PROCESSING: '#a855f7',
      SHIPPED: '#f97316',
      DELIVERED: '#22c55e',
      COMPLETED: '#22c55e',
      CANCELLED: '#ef4444',
    }

    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      color: statusColors[status] || '#6b7280',
    }))

    // Category breakdown
    const categoryData: Record<string, { revenue: number; count: number }> = {}

    orders.forEach(order => {
      order.OrderItem.forEach(item => {
        const category = item.Product.category || 'Uncategorized'
        if (!categoryData[category]) {
          categoryData[category] = { revenue: 0, count: 0 }
        }
        categoryData[category].revenue += Number(item.price) * item.quantity
        categoryData[category].count += 1
      })
    })

    const categoryBreakdown = Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8) // Top 8 categories

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedOrders,
      pendingOrders,
      totalOrders,
      topProducts,
      revenueByMonth,
      ordersByStatus,
      categoryBreakdown,
      previousMonthRevenue: Math.round(previousMonthRevenue * 100) / 100,
      previousMonthOrders: previousMonthOrderCount,
    })

  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}
