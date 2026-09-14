import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * UI layer.
 *
 * The design system for this product: tokens, primitives, and the chart theme.
 *
 * It is allowed to know the product's visual vocabulary, which includes public
 * standards like Nutri-Score and NOVA, and it may depend on `#shared/domain`,
 * because the domain is defined without reference to any API. What it must not
 * know is where data comes from: no endpoints, no fetching, no upstream shapes,
 * no Pinia Colada.
 *
 * That is the test applied before moving a component down into this layer. It
 * is a narrower claim than "works in any product", and it is the one that
 * actually holds: a badge that renders a regulated food label was never going
 * to be reusable in a banking app, and pretending otherwise would just push the
 * domain types somewhere less honest.
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
    dirs: [join(layerDir, 'app/composables')],
  },

  css: [join(layerDir, 'app/assets/css/ui.css')],
})
