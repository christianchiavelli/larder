import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const layerDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],

  // The layer's own words, a pagination's or a dialog's, merged into the app's. None of them
  // is about food, so the boundary holds in every language.
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'pt', file: 'pt-BR.json' },
    ],
  },

  components: [
    {
      path: join(layerDir, 'app/components'),
      prefix: 'Ui',
      pathPrefix: false,
      global: false,
      // A story beside its component is not a component of its own.
      ignore: ['**/*.stories.ts'],
    },
  ],

  imports: {
    dirs: [join(layerDir, 'app/composables'), join(layerDir, 'app/utils')],
  },

  css: [join(layerDir, 'app/assets/css/ui.css')],

  vite: {
    optimizeDeps: {
      include: [
        '@fortawesome/fontawesome-svg-core',
        '@fortawesome/free-solid-svg-icons',
        '@fortawesome/vue-fontawesome',
        'echarts/charts',
        'echarts/components',
        'echarts/core',
        'echarts/renderers',
        'vue-echarts',
      ],
    },
  },
})
