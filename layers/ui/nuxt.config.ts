import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * The design system: tokens, primitives, formatting and the chart theme.
 *
 * The boundary is values, never meaning. Nothing here imports `#shared/domain`
 * or knows what a Nutri-Score grade is. The test before a component moves down
 * is not "could another product use it" but "does this name a domain concept".
 * No data reaches this layer either: no endpoints, no fetching, no Pinia Colada.
 */

// Nuxt resolves `css` entries as module ids, not relative to the config file,
// so a layer has to hand it an absolute path or the entry silently resolves
// against the consuming app instead.
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
})
