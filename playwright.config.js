// @ts-check
import { defineConfig, devices } from '@playwright/test'

// Smoke + interactive tests against the live production deployment.
// Runs against https://www.getroadwave.com by default. Override per-run
// with: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? 'https://www.getroadwave.com'

export default defineConfig({
  testDir: './tests',
  // Each test gets up to 60s; assertions retry up to 10s. Live network +
  // server-rendered RSC can spike on cold cache.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // 4 workers strikes a balance: fast enough for the suite, light enough
  // to also exercise the concurrent-signup test without overwhelming the
  // origin.
  workers: 4,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Pre-confirm the AgeGate so tests don't get blocked by the 18+ modal
    // on first visit. The flag matches src/components/ui/age-gate.tsx
    // (STORAGE_KEY = 'roadwave:age-18-confirmed'). If you ever add a
    // dedicated test that exercises the age gate itself, override this
    // in that test's context.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'roadwave:age-18-confirmed', value: '1' },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
