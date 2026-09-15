import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * UI layer.
 *
 * The design system for this product: tokens, primitives, formatting and the
 * chart theme.
 *
 * The boundary is values, never meaning. Nothing here imports from
 * `#shared/domain`, and nothing here knows what a Nutri-Score grade is or that
 * food is being catalogued at all. It knows there is a surface, an ink, a
 * series colour and a token called `--nutriscore-a`, in the same way a
 * stylesheet does.
 *
 * So the test before a component moves down here is not "could another product
 * use it". It is "does this file name a concept from the problem domain". A
 * badge typed on `NutriScore` fails that and lives in `app/components/product`;
 * the panel it sits on passes and lives here.
 *
 * It follows that no data reaches this layer either: no endpoints, no fetching,
 * no upstream shapes, no Pinia Colada.
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
