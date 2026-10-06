import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.VITALS_PORT ?? 3220)
const UPSTREAM_PORT = PORT + 1
const UPSTREAM = `http://localhost:${UPSTREAM_PORT}`
const recording = !!process.env.VITALS_RECORD

/**
 * The Core Web Vitals of the production build, on the phone and connection
 * of Lighthouse's mobile run, against Open Food Facts as it answered once
 * (`e2e/vitals/catalogue.json`). Each page's median is held against the last
 * accepted measurement (`e2e/vitals/baseline.json`).
 *
 *   pnpm vitals          builds, then measures every page
 *   pnpm vitals:record   builds, then records what the pages ask Open Food Facts
 *
 * One visit at a time, and nothing recorded on the side: a measurement
 * shares the machine with nothing, not even a trace of itself.
 */
export default defineConfig({
  testDir: './e2e/vitals',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // A measurement retried until it passes measures nothing.
  retries: 0,
  timeout: 10 * 60_000,
  // Four times slower, on slow 4G, a page takes longer to answer than the suite's default allows.
  expect: { timeout: 20_000 },
  reporter: [[process.env.CI ? 'github' : 'list'], ['./e2e/vitals/reporter.ts']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    // Chrome itself, headless, rather than the lighter shell the suite runs in: it paints the way Chrome does.
    channel: 'chromium',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    // A tap that finds nothing to tap fails within a minute, not at the end of the visit.
    actionTimeout: 60_000,
  },

  webServer: [
    {
      command: 'node e2e/support/recorded-upstream.mjs',
      port: UPSTREAM_PORT,
      reuseExistingServer: false,
      env: { PORT: String(UPSTREAM_PORT), RECORD: recording ? '1' : '' },
    },
    {
      command: 'node .output/server/index.mjs',
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(PORT),
        NITRO_PORT: String(PORT),
        NUXT_OPEN_FOOD_FACTS_SEARCH_BASE: `${UPSTREAM}/search`,
        NUXT_OPEN_FOOD_FACTS_PRODUCT_BASE: `${UPSTREAM}/world`,
        NUXT_PUBLIC_I18N_BASE_URL: `http://localhost:${PORT}`,
      },
    },
  ],
})
