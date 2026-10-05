import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'

/**
 * Gives the static Storybook its fonts. @nuxt/fonts points the stylesheet at
 * `/_fonts/*` and fetches those files as Nitro builds, or serves them from a
 * dev handler; Storybook's build runs neither, so its `_fonts` stayed empty and
 * every story fell back to Georgia and Arial (nuxt-modules/storybook#820).
 * Here they are fetched once the bundle is written, beside it.
 */
export default defineNuxtModule({
  meta: { name: 'storybook-fonts' },
  setup(_, nuxt) {
    if (nuxt.options.buildId !== 'storybook') return

    let fonts = new Map<string, string>()
    nuxt.hook('fonts:public-asset-context', (context) => {
      fonts = context.renderedFontURLs
    })

    addVitePlugin(
      {
        name: 'larder:storybook-fonts',
        apply: 'build',
        async writeBundle({ dir }) {
          if (!dir) return
          const folder = join(dir, '_fonts')
          await mkdir(folder, { recursive: true })
          await Promise.all(
            Array.from(fonts, async ([file, url]) => {
              const response = await fetch(url)
              if (!response.ok) throw new Error(`${url} answered ${response.status}`)
              await writeFile(join(folder, file), new Uint8Array(await response.arrayBuffer()))
            }),
          )
        },
      },
      { server: false },
    )
  },
})
