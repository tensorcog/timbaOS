# timbaOS 🌲

**Modern ERP System for Lumber Yards & Building Material Suppliers**

timbaOS is a next-generation enterprise resource planning system specifically designed for lumber yards, building material suppliers, and hardware stores. Built with modern web technologies and featuring AI-powered automation for multi-location businesses.

---

## Features

### Core ERP Functionality
- **Multi-Location Support** - Manage multiple stores, warehouses, and distribution centers
- **Inventory Management** - Track stock levels per location with reorder points
- **Order Processing** - Complete order management with pickup and delivery options
- **Customer Management** - Track customer accounts, credit limits, and purchase history
- **Product Catalog** - Master product catalog with location-specific pricing
- **Inter-Location Transfers** - Move inventory between locations with approval workflow

### Automated Monitoring
- **StockWatcher** - Automated inventory monitoring with threshold-based low-stock alerts
- **Location-Specific Monitoring** - Individual monitoring for each store location
- **Global Analytics** - Cross-location performance reporting
- **Transfer Management** - Manual inventory transfers between locations

### Multi-Location Features
- **Per-Location Inventory** - Separate stock tracking for each location
- **Location-Specific Pricing** - Override base prices per store
- **User Access Control** - Role-based access with location restrictions
- **Consolidated Reporting** - View all locations or drill down to specific stores
- **Warehouse Management** - Dedicated warehouse locations for distribution

### Admin & Migration Tools
- **ECI Spruce Migration** - Import data from ECI Spruce lumber yard software
- **CSV/Excel Import** - Upload products, customers, and orders
- **Automatic Column Mapping** - Smart field detection for imports
- **Location Mapping** - Map imported data to specific locations
- **Data Preview** - Review before importing

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **UI Components**: Custom components with gradient design system

---

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd spruce-killer

# Run the setup script
bash setup.sh

# Or manual install:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
npm install
```

### 2. Database Setup

```bash
# Configure your database URL in .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pine_db?schema=public"

# Reset database and seed with sample data
npx prisma migrate reset --force
npx prisma generate
npm run seed
```

### 3. Run the Application

```bash
# Development mode
npm run dev

# Production
npm run build
npm start
```

Visit `http://localhost:3000`

---

## Project Structure

```
spruce-killer/
├── prisma/
│   ├── schema.prisma          # Database schema (multi-location)
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/run/     # AI agent endpoint
│   │   │   └── locations/     # Location APIs
│   │   ├── dashboard/
│   │   │   ├── admin/         # Admin & import pages
│   │   │   ├── orders/        # Order management
│   │   │   ├── products/      # Product catalog
│   │   │   ├── customers/     # Customer management
│   │   │   ├── transfers/     # Inventory transfers
│   │   │   └── analytics/     # Reporting & analytics
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── agent-interface.tsx      # AI agent UI
│   │   ├── dashboard-shell.tsx      # Main layout with nav
│   │   └── location-selector.tsx    # Location switcher
│   ├── lib/
│   │   ├── agents/
│   │   │   └── inventory-agent.ts   # StockWatcher AI agent
│   │   ├── context/
│   │   │   └── location-context.tsx # Location state management
│   │   ├── hooks/
│   │   │   └── useLocationInventory.ts
│   │   ├── agent-core.ts            # Base agent class
│   │   └── prisma.ts                # Prisma client
│   └── styles/
├── docs/                      # Documentation
│   ├── MIGRATION.md           # Migration guide
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── QUICKSTART.md
│   └── SCHEMA_IMPROVEMENTS.md
└── README.md                  # This file
```

---

## Database Models

### Core Models

- **Location** - Store/warehouse locations with manager assignments
- **Product** - Master product catalog with base pricing
- **LocationInventory** - Per-location stock levels, reorder points, aisle/bin
- **LocationPricing** - Location-specific price overrides
- **Customer** - Customer accounts with credit limits and tax status
- **Order** - Sales orders tied to specific locations
- **OrderItem** - Order line items
- **InventoryTransfer** - Inter-location inventory movements
- **TransferItem** - Transfer line items
- **User** - User accounts with roles
- **UserLocation** - User-location access mapping
- **Agent** - AI agent configurations

### User Roles

- **SUPER_ADMIN** - Full access to all locations and features
- **LOCATION_ADMIN** - Full access to assigned location(s)
- **MANAGER** - Operational access to assigned location(s)
- **SALES** - Order entry and customer management
- **WAREHOUSE** - Inventory and transfer management

---

## Key Features Explained

### 1. Multi-Location Architecture

timbaOS uses a sophisticated multi-location architecture:

- **Products** exist in a master catalog with a `basePrice`
- **Inventory** is tracked separately per location via `LocationInventory`
- **Pricing** can be overridden per location via `LocationPricing`
- **Orders** are always tied to one location
- **Transfers** move inventory between locations

Example: A 2x4x8 pine board exists once in the product catalog, but has separate inventory records for "Main Yard" (450 units) and "Westside Branch" (320 units).

### 2. Automated Inventory Monitoring

Automated monitoring helps track inventory levels:

**StockWatcher**
- Monitors stock levels against configured reorder points
- Identifies items below threshold that need restocking
- Can operate per-location or across all locations
- Returns restock recommendations based on simple rules

**Implementation**
```typescript
class InventoryAgent extends BaseAgent {
  async run(locationId?: string): Promise<AgentResult> {
    // Query items where stockLevel < reorderPoint
    // Return items that need restocking
  }
}
```

**Future Enhancements** (Roadmap)
- Automated transfer suggestions between locations
- Purchase order generation
- Historical trend analysis

### 3. Location Selector

The location selector in the header allows users to:
- View available locations based on their access
- Switch between locations (saved to localStorage)
- See warehouse vs retail store indicators
- Filter all data by selected location

### 4. Inventory Transfers

Move inventory between locations:
- **Request** - Store manager requests transfer from warehouse
- **Approve** - Admin/warehouse approves request
- **Ship** - Items shipped from origin location
- **Receive** - Items received at destination location

Transfer statuses: PENDING → IN_TRANSIT → RECEIVED

---

## Migrating from ECI Spruce

### Export from ECI Spruce

1. **Products**: Reports → Product Catalog → Export to Excel
2. **Customers**: Reports → Customer List → Export to Excel
3. **Orders**: Reports → Order History → Export to Excel
4. **Inventory**: Include location codes in export

### Import to Pine ERP

1. Navigate to `/dashboard/admin/import`
2. Select import type (Products, Customers, Orders)
3. Upload your ECI Spruce Excel file
4. Review automatic column mappings
5. Map location codes (if multi-location)
6. Preview and import

See [MIGRATION.md](./docs/MIGRATION.md) for detailed instructions.

---

## Sample Data

After running `npm run seed`, you get:

### Locations
- **MAIN** - Main Yard (100 Pine Street)
- **WEST** - Westside Branch (450 West Avenue)
- **WARE** - Distribution Warehouse (1000 Industrial Parkway)

### Users (from seed file)
```
Email: admin@billssupplies.com     - Role: SUPER_ADMIN
Email: main.manager@billssupplies.com - Role: LOCATION_ADMIN (Main Yard)
Email: west.manager@billssupplies.com - Role: LOCATION_ADMIN (Westside Branch)
Email: sales@billssupplies.com       - Role: SALES (Main + West access)

Password for all: password (bcrypt hashed in database)

⚠️ These credentials only work with a freshly seeded database!
```

### Products
- 10 building materials across 4 categories
- Inventory distributed across all 3 locations
- Some items intentionally low stock for agent testing

### Orders
- 4 sample orders across locations
- Mix of PENDING and COMPLETED statuses
- Different fulfillment types (PICKUP, DELIVERY)

---

## API Endpoints

### Locations
```
GET  /api/locations                    # List all active locations
GET  /api/locations/[id]/inventory     # Get location inventory
```

### AI Agent
```
POST /api/agent/run                    # Run inventory agent
Body: { locationId?: string }
```

---

## Development

### Running Locally

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run seed      # Seed database
```

### Database Commands

```bash
npx prisma studio              # Open Prisma Studio (GUI)
npx prisma migrate dev         # Create new migration
npx prisma migrate reset       # Reset database
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema without migration
```

### Adding a New Location

```typescript
await prisma.location.create({
  data: {
    code: 'NORTH',
    name: 'North Branch',
    address: '...',
    phone: '...',
    email: '...',
    isActive: true,
    isWarehouse: false,
  }
});
```

### Creating Location Inventory

```typescript
await prisma.locationInventory.create({
  data: {
    locationId: location.id,
    productId: product.id,
    stockLevel: 100,
    reorderPoint: 20,
    reorderQuantity: 50,
    aisle: 'A1',
    bin: '10',
  }
});
```

---

## Roadmap

### MVP Features (Current Focus)
- [x] Multi-location architecture
- [x] Location selector
- [x] Per-location inventory
- [x] AI inventory agent
- [x] Admin import page structure
- [ ] CSV/Excel file parsing
- [ ] Actual import logic
- [ ] Order creation
- [ ] Inventory adjustments

### Phase 2
- [ ] Transfer creation UI
- [ ] Transfer approval workflow
- [ ] Email notifications
- [ ] Invoice generation
- [ ] Quote/Estimate system
- [ ] Delivery scheduling

### Phase 3
- [ ] Transfer suggestion agent
- [ ] Demand forecasting agent
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API for third-party integrations

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pine_db?schema=public"

# NextJS (auto-generated)
# No additional env vars required for basic setup
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Authentication**: This application uses NextAuth.js for authentication:
   - Session-based authentication with Prisma adapter
   - Password hashing with bcryptjs
   - Protected routes via middleware
   - Seed file includes test users with password "password" (bcrypt hashed)

2. **Current Implementation**:
   - ✅ NextAuth configured with Credentials provider
   - ✅ Passwords hashed with bcrypt
   - ✅ Session management via database
   - ✅ Protected dashboard routes
   - ⚠️ API routes need additional RBAC enforcement

3. **Before Production**:
   - Change all default passwords
   - Add rate limiting to login endpoint
   - Implement proper RBAC checks on all API routes
   - Enable HTTPS/SSL
   - Use proper secrets management for `NEXTAUTH_SECRET`

4. **Environment Variables**: Never commit `.env` files. Required variables:
   ```
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXTAUTH_URL="http://localhost:3000"
   ```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For questions or issues:
- Check [MIGRATION.md](./docs/MIGRATION.md) for setup help
- Review Prisma docs: https://www.prisma.io/docs
- Review Next.js docs: https://nextjs.org/docs

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

**timbaOS** - Modernizing lumber yard management, one location at a time. 🌲
