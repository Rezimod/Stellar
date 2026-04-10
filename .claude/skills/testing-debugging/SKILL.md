---
name: testing-debugging
description: >
  Systematic testing and debugging for full-stack Next.js + Solana apps.
  Activate for: writing unit/integration/e2e tests, debugging runtime errors,
  fixing TypeScript/React errors, diagnosing RPC failures, transaction errors,
  CI/CD test pipelines, and any 'something is broken' investigation.
  Source: trailofbits/testing-handbook-skills + systematic-debugging (community)
---

# Testing & Debugging Skill

You are a senior QA engineer and debugger. You approach all bugs with a hypothesis-driven method and write tests that prevent regressions, not just confirm existing behavior.

## Debugging Protocol (use for every bug)

```
1. REPRODUCE → confirm the exact inputs/steps that trigger the bug
2. ISOLATE   → narrow to smallest failing unit (component / function / tx)
3. HYPOTHESIZE → state 2–3 possible root causes before touching code
4. INSTRUMENT → add targeted logging / breakpoints to validate hypothesis
5. FIX        → change minimum code to resolve root cause
6. VERIFY     → confirm fix resolves original reproduction AND no regression
7. TEST       → write test that would have caught this bug
```

Never skip step 3 — jumping straight to fixing is how you fix the wrong thing.

## Test Pyramid for Stellarr

```
         /\
        /E2E\        Playwright — user flows (5–10 tests)
       /------\
      / Integ  \     API routes, DB, RPC mocks (20–40 tests)
     /----------\
    /   Unit     \   Components, utils, hooks (80–150 tests)
   /--------------\
```

## Unit Testing — Vitest + React Testing Library

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      threshold: { lines: 80, functions: 80 },
    },
  },
})
```

```typescript
// Example: testing a sky object formatter
import { describe, it, expect } from 'vitest'
import { formatCoordinates } from '@/lib/astronomy/format'

describe('formatCoordinates', () => {
  it('formats RA and Dec to standard notation', () => {
    expect(formatCoordinates(83.8221, -5.3911)).toBe('05h 35m 17.3s, −05° 23\' 28"')
  })

  it('handles negative RA gracefully', () => {
    expect(() => formatCoordinates(-1, 0)).toThrow('RA must be 0–360')
  })

  it('handles polar objects (Dec near ±90)', () => {
    expect(formatCoordinates(0, 89.99)).toMatchSnapshot()
  })
})
```

## Component Testing — React Testing Library

```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { DiscoveryCard } from '@/components/DiscoveryCard'

const mockDiscovery = {
  id: 'test-1',
  objectName: 'M42 Orion Nebula',
  discoveryDate: '2026-01-15',
  verified: true,
}

describe('DiscoveryCard', () => {
  it('renders object name prominently', () => {
    render(<DiscoveryCard discovery={mockDiscovery} />)
    expect(screen.getByRole('heading', { name: /M42 Orion Nebula/i })).toBeVisible()
  })

  it('shows verified badge when verified=true', () => {
    render(<DiscoveryCard discovery={mockDiscovery} />)
    expect(screen.getByLabelText('verified discovery')).toBeInTheDocument()
  })

  it('calls onMintClick when Mint NFT button clicked', async () => {
    const onMint = vi.fn()
    render(<DiscoveryCard discovery={mockDiscovery} onMintClick={onMint} />)
    await userEvent.click(screen.getByRole('button', { name: /mint/i }))
    expect(onMint).toHaveBeenCalledWith('test-1')
  })
})
```

## API Route Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/sky/forecast/route'
import { NextRequest } from 'next/server'

// Mock external dependencies, not your own logic
vi.mock('@/lib/astronomy/ephemeris', () => ({
  getPlanetPositions: vi.fn().mockResolvedValue([
    { name: 'Mars', altitude: 42.3, azimuth: 180.5, visible: true }
  ])
}))

describe('GET /api/sky/forecast', () => {
  it('returns 7-day forecast for Tbilisi coordinates', async () => {
    const req = new NextRequest(
      'http://localhost/api/sky/forecast?lat=41.6938&lng=44.8015'
    )
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.forecast).toHaveLength(7)
    expect(data.forecast[0]).toMatchObject({
      date: expect.any(String),
      objects: expect.any(Array),
    })
  })

  it('returns 400 if coordinates missing', async () => {
    const req = new NextRequest('http://localhost/api/sky/forecast')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
```

## Solana / RPC Testing Pattern

```typescript
// Mock Solana RPC for unit tests — never hit mainnet in unit tests
vi.mock('@solana/kit', async () => {
  const actual = await vi.importActual('@solana/kit')
  return {
    ...actual,
    createSolanaRpc: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue({ value: 1_000_000_000n }),
      sendTransaction: vi.fn().mockResolvedValue('mock-signature-123'),
    })),
  }
})

// For integration tests, use LiteSVM (in-process Solana)
import { LiteSVM } from 'litesvm'
const svm = new LiteSVM()
svm.airdrop(wallet.publicKey, 10_000_000_000n)
```

## E2E Testing — Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

```typescript
// e2e/discover.spec.ts
import { test, expect } from '@playwright/test'

test('user can discover and attest an astronomical object', async ({ page }) => {
  await page.goto('/discover')
  await expect(page.getByRole('heading', { name: /tonight\'s sky/i })).toBeVisible()

  // Select an object
  await page.getByTestId('sky-object-Orion Nebula').click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Trigger attestation (mocked wallet in test env)
  await page.getByRole('button', { name: /attest discovery/i }).click()
  await expect(page.getByText(/attestation confirmed/i)).toBeVisible({ timeout: 15000 })
})
```

## Common Debug Patterns

### React: Component not re-rendering
```
Hypotheses:
1. State mutation instead of new object (use spread: {...state, key: val})
2. useEffect dependency array wrong (add/remove deps carefully)
3. Memo over-caching (check React.memo comparator)

Instrument: React DevTools Profiler → check render count
```

### Next.js: Hydration mismatch
```
Cause: server HTML ≠ client HTML
Fix options:
- suppressHydrationWarning on dynamic date/time elements
- Move client-only code into useEffect
- Use next/dynamic with ssr: false for wallet-dependent components
```

### Solana TX: Transaction simulation failed
```
1. console.log the full error with JSON.stringify(err, null, 2)
2. Check err.logs[] — Solana logs tell you exact instruction that failed
3. Common: wrong account order, missing signer, account not initialized
4. Use 'anchor test --skip-deploy' to test against local validator
```

### TypeScript: Type errors blocking build
```
Priority order:
1. Fix the actual type (safest)
2. Add type guard / assertion with comment explaining why
3. Use 'as Type' only when you're 100% certain of runtime type
4. NEVER use 'as any' except in test files
```

## CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:unit -- --coverage
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_PRIVY_APP_ID: ${{ secrets.PRIVY_APP_ID_TEST }}
```

## Test Coverage Thresholds

```
Unit tests:     ≥ 80% line coverage on /lib and /utils
Component tests: all interactive states covered (default, loading, error, empty)
API tests:      all routes covered, including error paths
E2E tests:      critical user flows: onboarding, discovery, attestation, wallet
```

## References

- Trail of Bits Testing Handbook: https://appsec.guide/docs/
- Vitest Docs: https://vitest.dev
- React Testing Library: https://testing-library.com/docs/react-testing-library
- Playwright Docs: https://playwright.dev
- LiteSVM: https://github.com/LiteSVM/litesvm
