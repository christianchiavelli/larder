import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6106)

/**
 * Every story of the built Storybook, in both themes: it must render, its play
 * function must pass, and axe must find nothing. A suite of its own, since the
 * app's runs against a production build of the app.
 *
 * Storybook's Vitest addon would run the stories in place, but the Nuxt
 * framework cannot run under it yet ("StoryContext is not provided"), so the
 * stories are checked where they are published instead.
 */
export default defineConfig({
  testDir: './.storybook',
  testMatch: 'stories.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    // Reduced motion zeroes what slides or fades in, so axe never measures a colour mid-fade.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node .storybook/serve.mjs',
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: false,
    env: { PORT: String(PORT) },
  },
})
