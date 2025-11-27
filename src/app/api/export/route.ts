import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

type ExportType = "products" | "customers" | "orders"
type ExportFormat = "csv" | "xlsx"

interface ExportParams {
  type: ExportType
  format: ExportFormat
  filters?: {
    dateRange?: string
    customStartDate?: string
    customEndDate?: string
    category?: string
    status?: string
    locationId?: string
  }
}

// Helper function to convert data to CSV format
function convertToCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(",")
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Handle values that contain commas or quotes
      if (value === null || value === undefined) return ""
      const stringValue = String(value)
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(",")
  })
  return [headerRow, ...rows].join("\n")
}

// Helper function to get date range filter
function getDateRangeFilter(filters?: ExportParams["filters"]) {
  if (!filters?.dateRange || filters.dateRange === "all") {
    return undefined
  }

  const now = new Date()
  let startDate: Date

  switch (filters.dateRange) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case "custom":
      if (filters.customStartDate) {
        startDate = new Date(filters.customStartDate)
      } else {
        return undefined
      }
      break
    default:
      return undefined
  }

  const endDate = filters.dateRange === "custom" && filters.customEndDate
    ? new Date(filters.customEndDate)
    : now

  return {
    gte: startDate,
    lte: endDate
  }
}

export async function POST(request: NextRequest) {
  try {
    const params: ExportParams = await request.json()
    const { type, format, filters } = params

    let data: any[] = []
    let headers: string[] = []
    let filename = `${type}_export_${new Date().toISOString().split('T')[0]}`

    // Fetch data based on export type
    switch (type) {
      case "products":
        const productWhere: any = {
          isActive: true
        }

        if (filters?.category) {
          productWhere.category = filters.category
        }

        const products = await prisma.product.findMany({
          where: productWhere,
          include: {
            inventory: {
              include: {
                location: true
              }
            },
            pricing: {
              include: {
                location: true
              }
            }
          }
        })

        // Flatten product data for export
        data = products.map(product => ({
          SKU: product.sku,
          Name: product.name,
          Description: product.description || "",
          Category: product.category || "",
          "Base Price": product.basePrice.toFixed(2),
          "Unit of Measure": product.uom,
          "Is Active": product.isActive ? "Yes" : "No",
          "Total Inventory": product.inventory.reduce((sum, inv) => sum + inv.stockLevel, 0),
          "Created Date": product.createdAt.toISOString().split('T')[0]
        }))

        headers = ["SKU", "Name", "Description", "Category", "Base Price", "Unit of Measure", "Is Active", "Total Inventory", "Created Date"]
        break

      case "customers":
        const customers = await prisma.customer.findMany({
          orderBy: {
            createdAt: "desc"
          }
        })

        data = customers.map(customer => ({
          Name: customer.name,
          Email: customer.email,
          Phone: customer.phone || "",
          Address: customer.address || "",
          "Customer Type": customer.customerType,
          "Account Number": customer.accountNumber || "",
          "Credit Limit": customer.creditLimit?.toFixed(2) || "0.00",
          "Tax Exempt": customer.taxExempt ? "Yes" : "No",
          "Tax ID": customer.taxId || "",
          "Loyalty Points": customer.loyaltyPoints,
          "Created Date": customer.createdAt.toISOString().split('T')[0]
        }))

        headers = ["Name", "Email", "Phone", "Address", "Customer Type", "Account Number", "Credit Limit", "Tax Exempt", "Tax ID", "Loyalty Points", "Created Date"]
        break

      case "orders":
        const orderWhere: any = {}

        const dateFilter = getDateRangeFilter(filters)
        if (dateFilter) {
          orderWhere.createdAt = dateFilter
        }

        if (filters?.status) {
          orderWhere.status = filters.status
        }

        const orders = await prisma.order.findMany({
          where: orderWhere,
          include: {
            customer: true,
            location: true,
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        })

        data = orders.map(order => ({
          "Order Number": order.orderNumber,
          "Customer Name": order.customer.name,
          "Customer Email": order.customer.email,
          "Location": order.location.name,
          "Order Type": order.orderType,
          Status: order.status,
          "Payment Status": order.paymentStatus,
          "Fulfillment Type": order.fulfillmentType,
          "Item Count": order.items.length,
          Subtotal: order.subtotal.toFixed(2),
          "Discount Amount": order.discountAmount.toFixed(2),
          "Tax Amount": order.taxAmount.toFixed(2),
          "Delivery Fee": order.deliveryFee.toFixed(2),
          "Total Amount": order.totalAmount.toFixed(2),
          "Order Date": order.createdAt.toISOString().split('T')[0],
          "Delivery Date": order.deliveryDate?.toISOString().split('T')[0] || "",
          "Delivery Address": order.deliveryAddress || ""
        }))

        headers = ["Order Number", "Customer Name", "Customer Email", "Location", "Order Type", "Status", "Payment Status", "Fulfillment Type", "Item Count", "Subtotal", "Discount Amount", "Tax Amount", "Delivery Fee", "Total Amount", "Order Date", "Delivery Date", "Delivery Address"]
        break

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        )
    }

    // Generate file based on format
    if (format === "csv") {
      const csvContent = convertToCSV(data, headers)

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`
        }
      })
    } else if (format === "xlsx") {
      // For now, return CSV with xlsx extension
      // In production, you'd use a library like 'exceljs' or 'xlsx' to generate proper Excel files
      const csvContent = convertToCSV(data, headers)

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`
        }
      })
    }

    return NextResponse.json(
      { error: "Invalid export format" },
      { status: 400 }
    )

  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    )
  }
}

// GET endpoint to check export status or get metadata
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") as ExportType | null

    if (!type) {
      return NextResponse.json(
        { error: "Export type is required" },
        { status: 400 }
      )
    }

    // Return count of records that would be exported
    let count = 0

    switch (type) {
      case "products":
        count = await prisma.product.count({ where: { isActive: true } })
        break
      case "customers":
        count = await prisma.customer.count()
        break
      case "orders":
        count = await prisma.order.count()
        break
    }

    return NextResponse.json({
      type,
      recordCount: count,
      availableFormats: ["csv", "xlsx"]
    })

  } catch (error) {
    console.error("Export metadata error:", error)
    return NextResponse.json(
      { error: "Failed to fetch export metadata" },
      { status: 500 }
    )
  }
}
