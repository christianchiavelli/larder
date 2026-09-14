import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3210)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * End-to-end configuration.
 *
 * These specs cover what unit tests structurally cannot: whether a CSS utility
 * actually resolves, whether filter state survives a reload, whether the page
 * renders without a browser console error. Every one of those passes a type
 * check and a unit suite while being broken in a browser.
 *
 * Runs against a production build rather than the dev server. Tailwind's source
 * scanning, code splitting and SSR payloads all behave differently between the
 * two, and the design-token regression these tests exist to catch is precisely
 * the kind that a dev-only check would miss.
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
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node .output/server/index.mjs`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { PORT: String(PORT), NITRO_PORT: String(PORT) },
      },
})
