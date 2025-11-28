---
description: How to run tests properly without burning CPU
---

# Running Tests Workflow

## Quick Reference

### Run All Tests (Sequential)
```bash
npx playwright test --workers=1
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/pos.spec.ts
```

### Run Specific Test by Name
```bash
npx playwright test -g "POS Checkout Flow"
```

### Run Tests in Watch Mode (Development)
```bash
npx playwright test --ui
```

## Guidelines

### ❌ DON'T DO THIS
- **Never run multiple test commands in parallel terminals** - This was causing 9+ processes running simultaneously
- Don't run the full suite without `--workers=1` unless you have a specific reason
- Avoid running tests without filtering during active development

### ✅ DO THIS INSTEAD
- Run tests sequentially with `--workers=1` for reliability
- Use `-g` flag to run specific tests during development
- Use Playwright UI mode (`--ui`) for debugging
- Run full suite only before commits or in CI

## Common Test Commands

### POS Tests Only
```bash
npx playwright test tests/e2e/pos.spec.ts --workers=1
```

### Order Tests Only
```bash
npx playwright test tests/e2e/order.spec.ts --workers=1
```

### Run Failed Tests
```bash
npx playwright test --last-failed
```

### Debug Mode
```bash
npx playwright test --debug
```

### Generate HTML Report
```bash
npx playwright show-report
```

## Best Practices

1. **Kill existing processes first** if you're unsure:
   ```bash
   pkill -f "playwright test"
   ```

2. **Check running processes**:
   ```bash
   ps aux | grep playwright
   ```

3. **Run tests before pushing**:
   ```bash
   npx playwright test --workers=1
   ```

4. **CI/CD**: Let the CI system handle parallel execution, not local development
