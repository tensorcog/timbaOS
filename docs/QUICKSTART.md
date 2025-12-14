# TimbaOS - Quick Start Guide

Get TimbaOS up and running in 5 minutes!

---

## Prerequisites

- PostgreSQL database running
- Node.js v20+ (will be installed by setup script)

---

## Step 1: Setup (2 minutes)

```bash
# Run the automated setup script
bash setup.sh
```

This will:

- Install NVM if needed
- Install Node.js v20
- Install npm dependencies

**After setup completes, restart your terminal or run:**

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

---

## Step 2: Configure Database (1 minute)

Edit the `.env` file:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/pine_db?schema=public"
```

Replace with your actual database credentials.

---

## Step 3: Initialize Database (1 minute)

```bash
# Reset database and create tables
npx prisma migrate reset --force

# Generate Prisma client
npx prisma generate

# Seed with sample data
npm run seed
```

You should see:

```
🌲 Seeding Pine Lumber Yard (Multi-Location)...
✅ Created 4 users
✅ Created 3 locations
✅ Created user-location access
✅ Created 10 products in master catalog
✅ Created location inventory for all locations
✅ Created location-specific pricing
✅ Created 4 customers
✅ Created 4 orders across locations
✅ Created inventory transfers
✅ Created AI agents
🎉 Multi-location seed complete!
```

---

## Step 4: Run the App (30 seconds)

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## What You Get

### 3 Locations

- **Main Yard** - Main Street retail location
- **Westside Branch** - West Avenue retail location
- **Distribution Warehouse** - Industrial Parkway warehouse

### 4 Test Users

| Email                 | Role           | Access          |
| --------------------- | -------------- | --------------- |
| admin@pine.com        | SUPER_ADMIN    | All locations   |
| main.manager@pine.com | LOCATION_ADMIN | Main Yard       |
| west.manager@pine.com | LOCATION_ADMIN | Westside Branch |
| sales@pine.com        | SALES          | Main + Westside |

_All passwords: `hashed_password_here` (change in production!)_

### 10 Products

- Lumber (2x4s, 2x6s, cedar posts, pine boards)
- Plywood (CDX, oak)
- Hardware (screws, nails)
- Concrete (mix, rebar)

### Sample Data

- 30 inventory records (10 products × 3 locations)
- 4 orders
- 2 inventory transfers
- 3 AI agents

---

## Quick Tour

### 1. Location Selector

Click the location dropdown in the top-right header to switch between locations.

### 2. Dashboard

View overview metrics, recent orders, and the AI StockWatcher agent.

### 3. Products

See all products in the master catalog.

### 4. Orders

View orders filtered by selected location.

### 5. Admin Panel

Navigate to **Admin** in the sidebar to access:

- Data import wizard
- Location management
- Database tools (coming soon)

---

## Testing the AI Agent

1. Go to Dashboard
2. Select "Main Yard" from location selector
3. Click **"Run Agent Now"** on the StockWatcher card
4. Agent will show 4 low-stock items at Main Yard:

   - Cedar Post (8 left, needs 12 more)
   - CDX Plywood (3 left, needs 7 more)
   - Oak Plywood (6 left, at threshold)
   - Rebar (5 left, needs 10 more)

5. Switch to "Westside Branch"
6. Run agent again - shows different results!

---

## Next Steps

### Import Your Data

1. Export products from ECI Spruce to Excel
2. Go to `/dashboard/admin/import`
3. Select "Products"
4. Upload your file
5. Map columns (auto-detected)
6. Preview and import

### Add Users

Currently no auth is implemented. To add users:

```typescript
await prisma.user.create({
  data: {
    email: "user@example.com",
    name: "John Doe",
    password: await bcrypt.hash("password", 10),
    role: "SALES",
  },
});
```

### Customize Locations

1. Go to Admin → Locations (coming soon)
2. Or add via Prisma Studio: `npx prisma studio`
3. Edit locations table

---

## Troubleshooting

### "command not found: npx"

```bash
# Restart terminal or run:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### "Cannot connect to database"

Check your `DATABASE_URL` in `.env` file. Ensure PostgreSQL is running:

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"
```

### "Migration failed"

Reset and try again:

```bash
npx prisma migrate reset --force
npx prisma generate
npm run seed
```

### "Location selector not showing"

1. Check browser console for errors
2. Verify `/api/locations` returns data
3. Clear browser localStorage
4. Hard refresh (Ctrl+Shift+R)

### "Port 3000 already in use"

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run linter

# Database
npx prisma studio              # Open database GUI
npx prisma migrate dev         # Create migration
npx prisma migrate reset       # Reset database
npx prisma generate            # Generate client
npm run seed                   # Seed data

# Debugging
npx prisma db push             # Push schema without migration
npx prisma format              # Format schema file
```

---

## File Locations

- **Database Schema**: `prisma/schema.prisma`
- **Seed Data**: `prisma/seed.ts`
- **Environment**: `.env`
- **Dashboard**: `src/app/dashboard/`
- **API Routes**: `src/app/api/`
- **Components**: `src/components/`

---

## Getting Help

1. **Documentation**:

   - [README.md](./README.md) - Full project docs
   - [MIGRATION.md](./MIGRATION.md) - Database migration guide
   - [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details

2. **Database Issues**: See [Prisma Docs](https://www.prisma.io/docs)

3. **Next.js Issues**: See [Next.js Docs](https://nextjs.org/docs)

---

## What's Next?

After getting familiar with the system:

1. **Implement Authentication**

   - Install NextAuth.js
   - Add login page
   - Protect routes

2. **Add Your Data**

   - Import products from ECI Spruce
   - Import customers
   - Import historical orders

3. **Customize**

   - Add your locations
   - Configure reorder points
   - Set location pricing

4. **Go Live**
   - Set up production database
   - Configure environment variables
   - Deploy to Vercel/AWS/etc.

---

## Quick Tips

- **Switch locations** to see how data changes per location
- **Run the AI agent** multiple times to see real-time stock analysis
- **Use Prisma Studio** for quick database edits: `npx prisma studio`
- **Check seed data** to understand the multi-location structure
- **Start with imports** - the UI is ready, just needs parsing logic

---

Happy building! 🌲

For detailed documentation, see [README.md](./README.md)
