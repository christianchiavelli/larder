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
    '@nuxt/test-utils/module',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  vue: {
    compilerOptions: {
      // `<selectedcontent>` is part of the customizable select API and is too
      // new for Vue's element list, so without this the compiler treats it as
      // an unknown component and renders nothing where the selected option's
      // text should be. It has no hyphen, so the usual custom-element heuristic
      // does not catch it either.
      isCustomElement: (tag) => tag === 'selectedcontent',
    },
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
      // Open Sans for anything a reader scans or compares, Lora for headings.
      // Only the weights the type scale actually names are requested: a weight
      // nothing uses is a font file downloaded for nothing.
      { name: 'Open Sans', provider: 'google', weights: [400, 600, 700] },
      { name: 'Lora', provider: 'google', weights: [400, 600] },
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
