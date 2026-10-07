import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  extends: ['./layers/ui'],

  components: [
    // A story beside its component is not a component of its own.
    { path: '~/components', ignore: ['**/*.stories.ts'] },
  ],

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
    optimizeDeps: {
      include: ['zod'],
    },
  },

  runtimeConfig: {
    openFoodFacts: {
      searchBase: 'https://search.openfoodfacts.org',
      productBase: 'https://world.openfoodfacts.org',
      userAgent: 'Larder/0.1 (+https://github.com/christianchiavelli/larder)',
    },
    exportConcurrency: 2,
    public: {
      siteName: 'Larder',
      // Where the catalogue's photos come from, for the pages to connect early and the content
      // security policy to let in. The Web Vitals point it at their recording of the photos.
      openFoodFacts: { imageOrigin: 'https://images.openfoodfacts.org' },
      // Where the app is served, so each page links its other language by a whole URL, as
      // search engines read them. NUXT_PUBLIC_I18N_BASE_URL points them anywhere else.
      i18n: { baseUrl: 'http://localhost:3000' },
    },
  },

  fonts: {
    // Google first, rather than pinned on each family: a family pinned to a provider takes that
    // provider's fallback, the bare generic name, which no installed font answers to (fontless
    // 0.2). Text then waits in Georgia and Arial as they are, wider than Lora and Open Sans, and
    // rewraps when the fonts arrive. Unpinned, the fallbacks below are sized to each family.
    priority: ['google'],
    families: [
      { name: 'Open Sans', weights: [400, 600, 700] },
      { name: 'Lora', weights: [400, 600] },
    ],
    defaults: {
      // Georgia first, the nearest to Lora of the serifs a laptop or a phone already has, and
      // Noto Serif for Android, which has neither of the others. Sans keeps fontless's own list.
      fallbacks: { serif: ['Georgia', 'Times New Roman', 'Noto Serif'] },
    },
  },

  // English at the root, Brazilian Portuguese under /pt. Each page has one address per
  // language and nothing redirects by the browser's, so a shared link opens in the language its
  // sender read, and the cached front page is the same for everyone who asks for it.
  i18n: {
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'pt', language: 'pt-BR', name: 'Português', file: 'pt-BR.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    experimental: { typedOptionsAndMessages: 'default' },
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  typescript: {
    typeCheck: false,
    strict: true,
  },

  routeRules: {
    // Pages also get a Content-Security-Policy of their own, from
    // server/plugins/content-security-policy.ts.
    '/**': {
      headers: {
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'cross-origin-opener-policy': 'same-origin',
      },
    },
    '/': { swr: 3600 },
    '/pt': { swr: 3600 },
  },

  nitro: {
    // The built scripts and styles are packed once, at the best brotli and gzip there are, and
    // sent as each browser accepts. Pages and answers are packed as they go out, by the
    // plugin in server/plugins/compression.ts.
    compressPublicAssets: true,
  },

  experimental: {
    viewTransition: true,
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },

    viewTransition: false,
  },

  devtools: { enabled: true },
})
