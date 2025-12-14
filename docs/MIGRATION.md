# TimbaOS - Database Migration & Setup Guide

## Multi-Location Architecture Implementation

This guide covers setting up the new multi-location database schema and migrating from the old single-location structure.

---

## Prerequisites

Before starting, ensure you have:

- Node.js v20+ installed
- PostgreSQL database running
- Database URL configured in `.env` file

---

## Step 1: Install Dependencies

```bash
# Load NVM and install Node v20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Install project dependencies
npm install
```

---

## Step 2: Reset Database (Fresh Install)

If you're starting fresh or want to reset the database:

```bash
# Reset database and apply new schema
npx prisma migrate reset --force

# Generate Prisma client
npx prisma generate

# Seed database with multi-location sample data
npm run seed
```

This will create:

- **3 Locations**: Main Yard, Westside Branch, Distribution Warehouse
- **10 Products** in master catalog
- **Location-specific inventory** for each location
- **4 Users** with different roles and location access
- **4 Sample orders** across locations
- **2 Inventory transfers**
- **3 AI Agents** (2 location-specific, 1 global)

---

## Step 3: Create Migration (Existing Database)

If you have existing data and need to migrate:

```bash
# Create a new migration
npx prisma migrate dev --name add_multi_location_support

# This will:
# 1. Create new tables (Location, LocationInventory, etc.)
# 2. Preserve existing data where possible
# 3. Generate the Prisma client
```

### Manual Data Migration Steps

After running the migration, you'll need to manually migrate data:

1. **Create your locations:**

```sql
INSERT INTO "Location" (id, code, name, address, phone, email, "isActive", "isWarehouse", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'MAIN', 'Main Store', '123 Main St', '555-0100', 'main@example.com', true, false, NOW(), NOW()),
  (gen_random_uuid(), 'WEST', 'West Branch', '456 West Ave', '555-0200', 'west@example.com', true, false, NOW(), NOW());
```

2. **Migrate product inventory to location inventory:**

```sql
-- For each location, create inventory records
INSERT INTO "LocationInventory" (id, "locationId", "productId", "stockLevel", "reorderPoint", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  (SELECT id FROM "Location" WHERE code = 'MAIN'),
  p.id,
  p."stockLevel",
  10, -- default reorder point
  NOW(),
  NOW()
FROM "Product" p;
```

3. **Update product table (rename price to basePrice):**

```sql
-- This should be handled by migration, but verify:
-- Product.price → Product.basePrice
```

4. **Add location to existing orders:**

```sql
-- Assign all existing orders to main location
UPDATE "Order"
SET "locationId" = (SELECT id FROM "Location" WHERE code = 'MAIN')
WHERE "locationId" IS NULL;
```

---

## Step 4: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Access the app at: `http://localhost:3000`

---

## Database Schema Overview

### Key Changes

#### New Models

1. **Location** - Store/warehouse locations
2. **LocationInventory** - Per-location inventory tracking
3. **LocationPricing** - Location-specific pricing overrides
4. **InventoryTransfer** - Inter-location transfers
5. **TransferItem** - Transfer line items
6. **User** - User accounts with role-based access
7. **UserLocation** - User-location access mapping

#### Modified Models

1. **Product**

   - `price` → `basePrice` (master price across locations)
   - `stockLevel` removed (now in LocationInventory)
   - Added: `uom` (unit of measure), `isActive`

2. **Order**

   - Added: `locationId` (required - which location processed the order)
   - Added: `orderNumber` (unique order identifier)
   - Added: `fulfillmentType`, `deliveryAddress`, `deliveryDate`, `deliveryFee`
   - Added: `salesRepId` (user who created the order)

3. **Customer**

   - Added: `customerType` (RETAIL, CONTRACTOR, WHOLESALE)
   - Added: `accountNumber`, `creditLimit`, `taxExempt`, `taxId`

4. **Agent**
   - Added: `scope` (LOCATION or GLOBAL)
   - Added: `locationId` (optional - for location-specific agents)

---

## ECI Spruce Migration Guide

### Exporting Data from ECI Spruce

1. **Products Export:**

   - Go to Reports → Product Catalog
   - Export to Excel
   - Ensure columns include: SKU, Name, Description, Price, Category

2. **Customers Export:**

   - Go to Reports → Customer List
   - Export to Excel
   - Ensure columns include: Name, Email, Phone, Address, Account Number

3. **Orders Export:**

   - Go to Reports → Order History
   - Select date range
   - Export to Excel
   - Include: Order Number, Customer, Date, Items, Total

4. **Inventory Export (if multi-location in ECI):**
   - Export with Location/Store Code column
   - Include: SKU, Location Code, Quantity, Aisle/Bin

### Importing to TimbaOS

1. **Navigate to Admin Panel:**

   - Go to `/dashboard/admin`
   - Click "Import Data"

2. **Select Import Type:**

   - Choose: Products, Customers, or Orders

3. **Upload File:**

   - Upload your ECI Spruce Excel export
   - System will auto-detect column mappings

4. **Map Locations (for inventory):**

   - Map ECI location codes to Pine locations
   - Example: ECI "MAIN" → Pine "Main Yard"

5. **Review & Import:**
   - Preview first 10 rows
   - Verify mappings
   - Click "Start Import"

### Field Mappings

#### ECI Spruce → TimbaOS

**Products:**

- `Item Number` → `sku`
- `Description` → `name`
- `Long Description` → `description`
- `Price` → `basePrice`
- `Category` → `category`
- `Unit` → `uom`

**Customers:**

- `Account No` → `accountNumber`
- `Name` → `name`
- `Email` → `email`
- `Phone` → `phone`
- `Address` → `address`
- `Type` → `customerType` (map: Retail→RETAIL, Contractor→CONTRACTOR, Wholesale→WHOLESALE)
- `Credit Limit` → `creditLimit`

**Inventory:**

- `Item Number` → product lookup by SKU
- `Store Code` → location lookup by code
- `On Hand` → `stockLevel`
- `Reorder Point` → `reorderPoint`
- `Location` (Aisle/Bin) → `aisle`

---

## Testing the Setup

### 1. Verify Locations

```bash
# Access the app and check the location selector in the header
# You should see: Main Yard, Westside Branch, Distribution Warehouse
```

### 2. Test Location Switching

- Switch between locations using the location selector
- Verify inventory shows different stock levels per location
- Check that orders are filtered by location

### 3. Test AI Agent

- Go to Dashboard
- Click "Run Agent Now" on the StockWatcher card
- Should show low stock items for the selected location

### 4. Test Inventory Transfers

- Navigate to `/dashboard/transfers`
- View pending and completed transfers
- Create a new transfer between locations

---

## Seed Data Details

The seed script creates the following test data:

### Locations

1. **MAIN** - Main Yard (Manager: Sarah Johnson)
2. **WEST** - Westside Branch (Manager: Mike Chen)
3. **WARE** - Distribution Warehouse

### Users

- `admin@pine.com` - SUPER_ADMIN (access to all locations)
- `main.manager@pine.com` - LOCATION_ADMIN (Main Yard)
- `west.manager@pine.com` - LOCATION_ADMIN (West Branch)
- `sales@pine.com` - SALES (Main + West)

### Products

10 products across categories:

- Lumber (4 items)
- Plywood (2 items)
- Hardware (2 items)
- Concrete (2 items)

### Inventory Distribution

- **Main Yard**: Mixed stock levels (some items low stock)
- **Westside Branch**: Generally healthy stock levels
- **Warehouse**: High stock levels for distribution

### Low Stock Items (for testing agent)

Main Yard low stock:

- Cedar Post (8 units, needs 12 more)
- CDX Plywood (3 units, needs 7 more)
- Oak Plywood (6 units, needs 0 - just at threshold)
- Rebar (5 units, needs 10 more)

---

## Troubleshooting

### Database Connection Issues

```bash
# Check your DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pine_db?schema=public"

# Test connection
npx prisma db push
```

### Migration Conflicts

```bash
# If you get migration conflicts, reset and start fresh
npx prisma migrate reset --force
npx prisma generate
npm run seed
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma client
npx prisma generate
```

### Location Selector Not Showing

- Check that LocationProvider is wrapping your dashboard
- Verify API endpoint `/api/locations` is accessible
- Check browser console for errors

---

## Next Steps

After successful migration:

1. **Configure Locations**

   - Add your actual store locations
   - Set manager assignments
   - Configure location-specific settings

2. **Import Your Data**

   - Use admin import tool for products
   - Import customers
   - Import historical orders

3. **Set Up Users**

   - Create user accounts for your team
   - Assign location access
   - Set appropriate roles

4. **Configure Agents**

   - Adjust reorder points per location
   - Set up agent schedules
   - Configure notifications

5. **Customize Inventory**
   - Set location-specific pricing
   - Configure aisle/bin locations
   - Set reorder quantities

---

## Support

For issues or questions:

- Check the GitHub issues
- Review Prisma documentation: https://www.prisma.io/docs
- Review Next.js documentation: https://nextjs.org/docs

---

## Architecture Highlights

### Multi-Location Benefits

1. **Separate Inventory Tracking**

   - Each location maintains its own stock levels
   - Prevents overselling from one location's inventory

2. **Location-Specific Pricing**

   - Override base prices per location
   - Support regional pricing strategies

3. **Inter-Location Transfers**

   - Move inventory between locations
   - Track transfer status and history
   - Approve/reject transfer requests

4. **Location-Based Reporting**

   - View metrics per location
   - Compare performance across locations
   - Consolidated views for management

5. **User Access Control**

   - Limit users to specific locations
   - Role-based permissions per location
   - Multi-location access for admins

6. **AI Agent Support**
   - Location-specific agents for monitoring
   - Global agents for analytics
   - Automatic transfer suggestions
