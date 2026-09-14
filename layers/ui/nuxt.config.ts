import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * UI layer.
 *
 * Owns the design system: tokens, primitives, and the chart theme. It knows
 * nothing about food, products, or the API. Anything in here should survive
 * being dropped into an unrelated product, which is the test we apply before
 * moving a component down into it.
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

  css: [join(layerDir, 'app/assets/css/ui.css')],
})
