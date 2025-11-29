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

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14.x or higher
- npm or yarn package manager

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/tensorcog/timbaOS.git
cd timbaOS

# Install Node.js dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root by copying the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database Connection
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/timbaos_db?schema=public"

# NextAuth Configuration
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Email Service (for notifications)
# RESEND_API_KEY="re_xxxxxxxxxxxx"
```

**Important**:
- Never commit your `.env` file to git
- Generate a secure `NEXTAUTH_SECRET` using `openssl rand -base64 32`
- Use a strong password for your database

### 3. Database Setup

```bash
# Create the database (if not exists)
createdb timbaos_db

# Run migrations to create tables
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed database with sample data (optional)
npm run seed
```

### 4. Run the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production build and start
npm run build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

Visit `http://localhost:3000`

### 5. Login with Seed Data

After seeding, you can log in with these test accounts:

```
Email: admin@billssupplies.com
Password: password
Role: SUPER_ADMIN

Email: main.manager@billssupplies.com
Password: password
Role: LOCATION_ADMIN
```

⚠️ **Change all default passwords before deploying to production!**

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

### Available Scripts

```bash
# Development
npm run dev         # Start dev server on port 3000
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint

# Testing
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Database
npm run seed        # Seed database with sample data
```

### Database Commands

```bash
npx prisma studio              # Open Prisma Studio (GUI)
npx prisma migrate dev         # Create new migration
npx prisma migrate deploy      # Apply migrations (production)
npx prisma migrate reset       # Reset database and run seeds
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema without migration (dev only)
```

### Testing

timbaOS uses Jest for unit testing and Playwright for E2E testing.

**Unit Tests**:
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Coverage is configured with an 80% threshold for:
- Statements
- Branches
- Functions
- Lines

**E2E Tests**:
```bash
# Run Playwright tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/invoice.spec.ts
```

### Writing Tests

Place unit tests in `__tests__` directories:
```
src/lib/
├── currency.ts
└── __tests__/
    └── currency.test.ts
```

Example test structure:
```typescript
import { currency } from '../currency';

describe('Currency', () => {
  it('should add two values correctly', () => {
    const result = currency(10).add(5);
    expect(result.toString()).toBe('15.00');
  });
});
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

All environment variables should be configured in a `.env` file (never commit this file!).

### Required Variables

```bash
# Database Connection
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL="postgresql://postgres:password@localhost:5432/timbaos_db?schema=public"

# NextAuth Authentication
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secure-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"  # Use your production URL in production
```

### Optional Variables

```bash
# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"

# Node Environment (automatically set by most platforms)
NODE_ENV="development"  # or "production"
```

### Environment File Structure

```
timbaOS/
├── .env              # Your local config (gitignored, never commit!)
├── .env.example      # Template with dummy values (safe to commit)
└── .env.production   # Production config (gitignored, never commit!)
```

---

## Security

### Authentication & Authorization

timbaOS implements comprehensive security measures:

**Authentication**:
- ✅ NextAuth.js with JWT session strategy
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Secure session management
- ✅ Protected routes via middleware
- ✅ Conditional debug mode (development only)

**Authorization**:
- ✅ Role-Based Access Control (RBAC)
- ✅ Location-based access restrictions
- ✅ API route authentication
- ✅ Type-safe session handling

**Security Features**:
- ✅ Input validation using Zod schemas
- ✅ SQL injection protection via Prisma ORM
- ✅ XSS protection via React's built-in escaping
- ✅ Database constraints (CHECK, UNIQUE, FOREIGN KEY)
- ✅ Inventory validation before transactions
- ✅ Audit logging for compliance

### Security Best Practices

**Before Production Deployment**:

1. **Secrets Management**:
   - ❌ Never commit `.env` files
   - ✅ Use strong, randomly generated secrets
   - ✅ Rotate secrets regularly
   - ✅ Use environment-specific secrets
   - ✅ Consider using a secrets manager (AWS Secrets Manager, Vault)

2. **Authentication**:
   - ✅ Change all default passwords
   - ✅ Enforce strong password policies
   - ❌ Remove or disable seed accounts
   - ✅ Implement password reset flow
   - ✅ Add rate limiting to login endpoints
   - ✅ Enable MFA for admin accounts

3. **Database**:
   - ✅ Use strong database passwords
   - ✅ Restrict database access to application only
   - ✅ Enable SSL for database connections
   - ✅ Regular backups with encryption
   - ✅ Keep Prisma and PostgreSQL updated

4. **Application**:
   - ✅ Enable HTTPS/SSL (use reverse proxy like nginx)
   - ✅ Set secure HTTP headers
   - ✅ Implement rate limiting (API abuse prevention)
   - ✅ Keep all dependencies updated
   - ✅ Run security audits: `npm audit`
   - ✅ Monitor logs for suspicious activity

5. **Environment**:
   - ✅ Set `NODE_ENV=production`
   - ✅ Disable debug logging in production
   - ✅ Use read-only file system where possible
   - ✅ Run with least-privilege user account
   - ✅ Configure CORS appropriately

### Vulnerability Reporting

If you discover a security vulnerability, please email security@example.com. Do not open a public issue.

### Recent Security Improvements

- Fixed: Plain-text password migration backdoor removed (2025-11-28)
- Fixed: POS checkout now requires authentication (2025-11-28)
- Fixed: Debug mode now conditional on NODE_ENV (2025-11-28)
- Fixed: Type-safe Session objects throughout (2025-11-28)
- Added: Inventory validation in POS checkout (2025-11-28)
- Added: Database CHECK constraint for non-negative inventory (2025-11-28)

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
