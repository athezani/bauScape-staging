# Testing Guide

## Overview

This project uses Vitest for unit testing with comprehensive coverage requirements. All tests must pass before deployment.

## Test Structure

```
src/
├── test/
│   └── setup.ts          # Test configuration and mocks
├── utils/
│   ├── *.test.ts         # Utility function tests
├── hooks/
│   ├── *.test.tsx        # React hook tests
├── components/
│   ├── *.test.tsx        # Component tests
└── lib/
    ├── *.test.ts         # Library function tests
```

## Running Tests

### Development
```bash
# Run tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Coverage
```bash
# Generate coverage report
npm run test:coverage

# Coverage report will be in coverage/ directory
```

### CI/CD
```bash
# Run tests in CI mode (with coverage and verbose output)
npm run test:ci
```

## Coverage Requirements

Tests must meet the following coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

If coverage falls below these thresholds, the build will fail.

## Writing Tests

### Example: Testing a Utility Function

```typescript
import { describe, it, expect } from 'vitest';
import { formatPriceFrom } from './priceUtils';

describe('formatPriceFrom', () => {
  it('should format price correctly', () => {
    expect(formatPriceFrom(50)).toBe('Da €50');
  });
});
```

### Example: Testing a React Component

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('should render product title', () => {
    const mockProduct = { id: '1', title: 'Test Product' };
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
```

### Example: Testing a React Hook

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProduct } from './useProduct';

describe('useProduct', () => {
  it('should return loading state initially', () => {
    const { result } = renderHook(() => useProduct('test-id', 'experience'));
    expect(result.current.loading).toBe(true);
  });
});
```

## Test Mocks

The test setup file (`src/test/setup.ts`) provides:
- Mocked Supabase client
- Mocked environment variables
- Cleanup after each test
- Suppressed console warnings

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The GitHub Actions workflow (`.github/workflows/test.yml`) will:
1. Install dependencies
2. Run linter (if configured)
3. Run all tests with coverage
4. Upload coverage reports
5. **Fail the build if tests fail**

## Best Practices

1. **Test all public functions** - Every exported function should have tests
2. **Test edge cases** - Include tests for null, undefined, empty values
3. **Test error handling** - Verify error messages and error states
4. **Keep tests isolated** - Each test should be independent
5. **Use descriptive names** - Test names should clearly describe what they test
6. **Mock external dependencies** - Don't make real API calls in tests
7. **Test user interactions** - For components, test user interactions (clicks, inputs)

## Common Issues

### "Cannot find module" errors
- Ensure all dependencies are installed: `npm install`
- Check that file paths are correct

### "Test timeout" errors
- Increase timeout for async operations
- Ensure mocks are properly configured

### "Coverage below threshold" errors
- Write more tests to cover missing code paths
- Review coverage report to identify uncovered lines

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)



