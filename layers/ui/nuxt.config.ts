import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const layerDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  components: [
    {
      path: join(layerDir, 'app/components'),
      prefix: 'Ui',
      pathPrefix: false,
      global: false,
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
