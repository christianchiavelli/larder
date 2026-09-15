import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  // The design system lives in its own layer. See layers/ui/nuxt.config.ts.
  extends: ['./layers/ui'],

  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxt/test-utils/module',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  // Private by default. Only `public` reaches the browser, and the upstream
  // User-Agent must not: Open Food Facts identifies callers by it.
  runtimeConfig: {
    openFoodFacts: {
      searchBase: 'https://search.openfoodfacts.org',
      productBase: 'https://world.openfoodfacts.org',
      userAgent: 'Larder/0.1 (+https://github.com/christianchiavelli/larder)',
    },
    public: {
      siteName: 'Larder',
    },
  },

  fonts: {
    families: [
      // Public Sans for anything a reader scans or compares, Fraunces for
      // headings. Fraunces is variable: the SOFT and WONK axes are what make it
      // read as editorial rather than as a default serif, and they only exist
      // in the variable build.
      { name: 'Public Sans', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Fraunces', provider: 'google', weights: [400, 600, 700] },
    ],
    defaults: {
      // Metric-adjusted local fallbacks, so the swap when the webfont lands
      // does not reflow the page.
      fallbacks: {
        'sans-serif': ['Helvetica Neue', 'Arial'],
        serif: ['Georgia', 'Times New Roman'],
      },
    },
  },

  eslint: {
    config: {
      // Formatting is Prettier's job. Keeping both would mean two sources of
      // truth for the same question.
      stylistic: false,
    },
  },

  typescript: {
    typeCheck: false,
    strict: true,
  },

  routeRules: {
    // Upstream is rate limited and its data changes on the order of days, so
    // the shell of every analytics page is served stale-while-revalidate.
    '/': { swr: 3600 },
  },

  devtools: { enabled: true },
})
