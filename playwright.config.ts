import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3210)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * These cover what a unit test structurally cannot: whether a CSS utility
 * resolves, whether filter state survives a reload, whether the page renders
 * without a console error. Run against a production build, because Tailwind
 * source scanning behaves differently under the dev server.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Upstream is rate limited and shared, so parallel workers would throttle
  // each other rather than finish sooner.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // One mobile profile, because the directory's filter panel reflows and a
    // layout that only works at desktop width is not a working layout.
    //
    // The round-trip suite is excluded: it talks to the API and never opens a
    // page, so a second run of it would double the load on a rate-limited
    // upstream to assert the same thing twice.
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testIgnore: /filter-round-trip\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node .output/server/index.mjs`,
        url: BASE_URL,

        /**
         * Never reuse: a leftover server keeps serving the build it started with, so a
         * run after `pnpm run build` silently tests the previous output. Twice now.
         */
        reuseExistingServer: false,
        timeout: 120_000,
        env: { PORT: String(PORT), NITRO_PORT: String(PORT) },
      },
})
