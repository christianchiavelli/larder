import { defineConfig, devices } from '@playwright/test'
import {
  BASE_URL,
  FAILING_UPSTREAM_PORT,
  PORT,
  RUNS_LOCALLY,
  SOURCE_DOWN_BASE_URL,
  SOURCE_DOWN_PORT,
} from './e2e/support/servers'

const FAILING_UPSTREAM = `http://localhost:${FAILING_UPSTREAM_PORT}`

export default defineConfig({
  testDir: './e2e',
  // The Web Vitals have a config of their own (playwright.vitals.config.ts).
  testIgnore: 'vitals/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      // A project's own list replaces the one above, so the Web Vitals are left out here too.
      testIgnore: ['vitals/**', /(filter-round-trip|export-contract|compression)\.spec\.ts/],
    },
  ],

  webServer: RUNS_LOCALLY
    ? [
        {
          command: `node .output/server/index.mjs`,
          url: BASE_URL,

          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            PORT: String(PORT),
            NITRO_PORT: String(PORT),
            NUXT_EXPORT_CONCURRENCY: '16',
            NUXT_PUBLIC_I18N_BASE_URL: BASE_URL,
          },
        },
        {
          command: 'node e2e/support/failing-upstream.mjs',
          port: FAILING_UPSTREAM_PORT,
          reuseExistingServer: false,
          env: { PORT: String(FAILING_UPSTREAM_PORT) },
        },
        {
          command: `node .output/server/index.mjs`,
          port: SOURCE_DOWN_PORT,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            PORT: String(SOURCE_DOWN_PORT),
            NITRO_PORT: String(SOURCE_DOWN_PORT),
            NUXT_PUBLIC_I18N_BASE_URL: SOURCE_DOWN_BASE_URL,
            NUXT_OPEN_FOOD_FACTS_SEARCH_BASE: FAILING_UPSTREAM,
            NUXT_OPEN_FOOD_FACTS_PRODUCT_BASE: FAILING_UPSTREAM,
          },
        },
      ]
    : undefined,
})
