import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

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
      isCustomElement: (tag) => tag === 'selectedcontent',
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
    },
  },

  fonts: {
    families: [
      { name: 'Open Sans', provider: 'google', weights: [400, 600, 700] },
      { name: 'Lora', provider: 'google', weights: [400, 600] },
    ],
    defaults: {
      fallbacks: {
        'sans-serif': ['Helvetica Neue', 'Arial'],
        serif: ['Georgia', 'Times New Roman'],
      },
    },
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
    '/': { swr: 3600 },
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
