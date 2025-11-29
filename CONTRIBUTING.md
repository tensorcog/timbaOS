# Contributing to timbaOS

Thank you for your interest in contributing to timbaOS! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

---

## Code of Conduct

### Our Standards

- **Be Respectful**: Treat all contributors with respect and professionalism
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Collaborative**: Work together to solve problems
- **Be Professional**: Maintain a professional tone in all interactions

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or inflammatory language
- Publishing others' private information
- Other conduct that would be inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 20.x or higher
- PostgreSQL 14.x or higher
- Git
- A GitHub account
- Familiarity with TypeScript, Next.js, and Prisma

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/timbaOS.git
   cd timbaOS
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/tensorcog/timbaOS.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Set up database**:
   ```bash
   npx prisma migrate dev
   npx prisma db seed  # Optional: seed with sample data
   ```

7. **Run tests** to verify setup:
   ```bash
   npm test
   ```

---

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync with the latest changes:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming conventions**:
- `feature/` - New features (e.g., `feature/inventory-alerts`)
- `fix/` - Bug fixes (e.g., `fix/payment-calculation`)
- `docs/` - Documentation only (e.g., `docs/update-api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/rate-limiter`)
- `test/` - Adding tests (e.g., `test/invoice-validation`)

### 3. Make Changes

Follow our [Code Standards](#code-standards) and write tests for your changes.

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 5. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: Add inventory alert thresholds

- Add threshold configuration to Location model
- Implement alert generation in StockWatcher
- Add unit tests for threshold logic

Closes #123"
```

**Commit message format**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create Pull Request

Open a pull request from your fork to `tensorcog/timbaOS:main`.

---

## Code Standards

### TypeScript

- **Strict mode enabled**: Fix all type errors
- **No `any` types**: Use proper types or `unknown` with type guards
- **Prefer interfaces** over type aliases for object shapes
- **Use const assertions** for literal types

**Good**:
```typescript
interface User {
    id: string;
    email: string;
    role: UserRole;
}

function getUser(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
}
```

**Bad**:
```typescript
function getUser(id: any): any {
    return prisma.user.findUnique({ where: { id } });
}
```

### Code Style

- **Indentation**: 4 spaces (not tabs)
- **Line length**: Max 100 characters (use Prettier)
- **Quotes**: Single quotes for strings, except JSX (double quotes)
- **Semicolons**: Always use semicolons
- **Trailing commas**: Use in multiline arrays/objects

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserById`, `orderTotal`)
- **Classes/Interfaces**: PascalCase (`User`, `OrderItem`, `RateLimitConfig`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `API_VERSION`)
- **Files**: kebab-case (`rate-limiter.ts`, `error-handler.ts`)
- **Components**: PascalCase (`UserProfile.tsx`, `OrderList.tsx`)

### File Organization

```typescript
// 1. Imports (external, then internal)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// 2. Types and Interfaces
interface CreateUserData {
    email: string;
    password: string;
}

// 3. Constants
const MAX_LOGIN_ATTEMPTS = 5;

// 4. Main code
export async function createUser(data: CreateUserData) {
    // Implementation
}

// 5. Helper functions (private, not exported)
function hashPassword(password: string): string {
    // Implementation
}
```

### Security Best Practices

- **Never log sensitive data**: passwords, tokens, credit cards, SSNs
- **Validate all inputs**: Use Zod schemas for runtime validation
- **Use parameterized queries**: Prisma handles this automatically
- **Rate limit sensitive endpoints**: Use `RateLimitPresets.AUTH` for auth
- **Hash passwords**: Use bcrypt with appropriate rounds (10+)
- **Sanitize user input**: Especially in error messages

### Error Handling

```typescript
import { logger } from '@/lib/logger';
import { classifyError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
    try {
        // Request handling
        const result = await someOperation();
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        logger.error('Operation failed', { error, context: 'POST /api/endpoint' });
        const { status, error: message, details } = classifyError(error);
        return NextResponse.json({ error: message, details }, { status });
    }
}
```

---

## Testing Requirements

### Coverage Requirements

- **Minimum coverage**: 80% for all metrics (lines, branches, functions, statements)
- **New code**: 100% coverage for critical paths (authentication, payments, financial calculations)
- **Bug fixes**: Add regression tests to prevent recurrence

### Test Structure

```typescript
describe('ModuleName', () => {
    describe('functionName', () => {
        it('should handle valid input', () => {
            const result = functionName(validInput);
            expect(result).toEqual(expectedOutput);
        });

        it('should reject invalid input', () => {
            expect(() => functionName(invalidInput)).toThrow();
        });

        it('should handle edge cases', () => {
            // Test boundary conditions
        });
    });
});
```

### What to Test

1. **Business Logic**: All calculations, validations, transformations
2. **Error Handling**: All error paths and edge cases
3. **Validation**: All Zod schemas with valid and invalid inputs
4. **API Routes**: Request/response handling (consider E2E tests)
5. **Utilities**: All utility functions with edge cases

### Writing Good Tests

**Good**:
```typescript
it('should calculate total with discount correctly', () => {
    const items = [
        { price: 100, quantity: 2, discount: 10 },
        { price: 50, quantity: 1, discount: 0 },
    ];
    const total = calculateOrderTotal(items);
    expect(total).toBe(240); // (100*2 - 10) + (50*1) = 240
});
```

**Bad**:
```typescript
it('should work', () => {
    const result = someFunction();
    expect(result).toBeTruthy(); // Too vague
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- currency.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Pull Request Process

### Before Submitting

1. ✅ **Tests pass**: `npm test` shows all green
2. ✅ **Coverage maintained**: No decrease in coverage
3. ✅ **Code formatted**: `npm run format` (if configured)
4. ✅ **No console errors**: Check browser console and terminal
5. ✅ **Database migrations**: Create if schema changed
6. ✅ **Documentation updated**: Update relevant docs

### PR Title Format

```
<type>: <description>

Examples:
feat: Add inventory alert system
fix: Resolve payment calculation rounding error
docs: Update API documentation for quotes
refactor: Improve rate limiter performance
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] E2E tests
- [ ] Manual testing

## Checklist
- [ ] My code follows the code style of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
```

### Review Process

1. **Submit PR**: Open pull request with descriptive title and description
2. **Automated checks**: Wait for CI/CD to complete (tests, linting)
3. **Code review**: Address reviewer feedback
4. **Approval**: Get at least one approval from a maintainer
5. **Merge**: Maintainer will merge your PR

### After Merge

1. **Sync your fork**:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   git push origin main
   ```

2. **Delete feature branch**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

---

## Project Structure

```
timbaOS/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   └── (auth)/            # Auth pages
│   ├── components/            # React components
│   ├── lib/                   # Utilities and libraries
│   │   ├── __tests__/        # Unit tests
│   │   ├── validations/      # Zod schemas
│   │   ├── auth.ts           # NextAuth config
│   │   ├── logger.ts         # Logging utility
│   │   └── rate-limiter.ts   # Rate limiting
│   └── types/                 # TypeScript type definitions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── docs/                      # Documentation
│   ├── API.md                # API documentation
│   ├── LOGGING.md            # Logging guide
│   └── MIGRATION.md          # Migration guide
├── tests/                     # E2E tests (Playwright)
└── public/                    # Static assets
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create route handler**:
   ```typescript
   // src/app/api/products/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { requireAuth } from '@/lib/api-auth';
   import { logger } from '@/lib/logger';

   export async function GET(request: NextRequest) {
       const { error, session } = await requireAuth(request);
       if (error) return error;

       try {
           const products = await prisma.product.findMany();
           logger.info('Products fetched', { count: products.length });
           return NextResponse.json(products);
       } catch (err) {
           logger.error('Failed to fetch products', { error: err });
           return NextResponse.json({ error: 'Internal error' }, { status: 500 });
       }
   }
   ```

2. **Add validation schema**:
   ```typescript
   // src/lib/validations/product.ts
   import { z } from 'zod';

   export const createProductSchema = z.object({
       name: z.string().min(1, 'Name is required'),
       sku: z.string().min(1, 'SKU is required'),
       basePrice: z.number().nonnegative('Price must be non-negative'),
   });
   ```

3. **Write tests**:
   ```typescript
   // src/lib/validations/__tests__/product.test.ts
   import { createProductSchema } from '../product';

   describe('createProductSchema', () => {
       it('should validate valid product', () => {
           const result = createProductSchema.safeParse({
               name: 'Test Product',
               sku: 'TEST-001',
               basePrice: 9.99,
           });
           expect(result.success).toBe(true);
       });
   });
   ```

4. **Update API docs**: Add endpoint to `docs/API.md`

### Adding a Database Migration

1. **Modify schema**:
   ```prisma
   // prisma/schema.prisma
   model Product {
       id          String   @id @default(cuid())
       name        String
       sku         String   @unique
       basePrice   Decimal  @db.Decimal(10, 2)
       // Add new field
       description String?
   }
   ```

2. **Create migration**:
   ```bash
   npx prisma migrate dev --name add_product_description
   ```

3. **Update TypeScript types** (Prisma auto-generates these)

4. **Test migration**:
   ```bash
   npx prisma migrate reset  # Test on fresh database
   npx prisma migrate dev    # Re-run migrations
   ```

### Adding a New Component

1. **Create component**:
   ```typescript
   // src/components/ProductCard.tsx
   interface ProductCardProps {
       product: {
           id: string;
           name: string;
           basePrice: number;
       };
   }

   export function ProductCard({ product }: ProductCardProps) {
       return (
           <div className="border rounded p-4">
               <h3 className="font-bold">{product.name}</h3>
               <p className="text-gray-600">${product.basePrice}</p>
           </div>
       );
   }
   ```

2. **Use in page**:
   ```typescript
   import { ProductCard } from '@/components/ProductCard';

   export default function ProductsPage() {
       return (
           <div>
               {products.map(p => <ProductCard key={p.id} product={p} />)}
           </div>
       );
   }
   ```

### Updating Documentation

- **API changes**: Update `docs/API.md`
- **New features**: Update `README.md`
- **Security changes**: Update `SECURITY.md`
- **Code changes**: Update JSDoc comments

---

## Questions?

- **GitHub Issues**: https://github.com/tensorcog/timbaOS/issues
- **GitHub Discussions**: https://github.com/tensorcog/timbaOS/discussions
- **Email**: security@timbaos.com (security issues only)

---

## License

By contributing to timbaOS, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to timbaOS! 🌲
