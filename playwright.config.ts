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

/**
 * Two tries after the first on CI, so a slow day at the catalogue does not block a push.
 *
 * The weekly run asks for none (`E2E_RETRIES=0` in `ci.yml`), because the tolerance exists
 * for somebody else's bad day and not for a test that only sometimes passes: with the
 * retries on, such a test is reported as a notice inside a green run, and nobody reads it.
 */
const RETRIES =
  process.env.E2E_RETRIES !== undefined ? Number(process.env.E2E_RETRIES) : process.env.CI ? 2 : 0

export default defineConfig({
  testDir: './e2e',
  // The Web Vitals have a config of their own (playwright.vitals.config.ts).
  testIgnore: 'vitals/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: RETRIES,
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
      testIgnore: [
        'vitals/**',
        /(filter-round-trip|export-contract|compression|security-headers)\.spec\.ts/,
      ],
    },
    {
      // WebKit is Safari, and every browser on a phone or a tablet that is not Android. This
      // app leans on the newest parts of the platform — a native <dialog>, popovers placed by
      // CSS anchor positioning, view transitions — which is exactly where the engines differ,
      // so the claim that a spec cannot vary by engine is the one worth testing.
      //
      // The accessibility scan is the suite it runs: a difference in any of those shows up
      // there as a page a reader cannot use, it covers every page in both themes, and it is
      // one file rather than the seventeen, which keeps the extra engine to a couple of
      // minutes instead of tripling the job.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /accessibility\.spec\.ts/,
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
