import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'

/**
 * Gives Storybook the fonts @nuxt/fonts points the stylesheet at, `/_fonts/*`.
 * The module fetches those files as Nitro builds, or serves them from a dev
 * handler, and Storybook runs neither. Its build shipped none, so every story
 * fell back to Georgia and Arial (nuxt-modules/storybook#820), and the stand-in
 * the module gives Storybook's dev server throws on the first font the machine
 * does not have installed, which takes the server down with it. Here they are
 * fetched as a story asks for them, and beside the bundle once it is written.
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
        // Ahead of @nuxt/fonts, so its handler never sees a request.
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use('/_fonts', async (request, response, next) => {
            const url = fonts.get(request.url?.slice(1) ?? '')
            if (!url) return next()
            try {
              const font = await download(url)
              // Named by a hash of what they hold, so a browser never needs to ask twice.
              response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
              response.end(font)
            } catch (error) {
              next(error)
            }
          })
        },
        async writeBundle({ dir }) {
          if (!dir) return
          const folder = join(dir, '_fonts')
          await mkdir(folder, { recursive: true })
          await Promise.all(
            Array.from(fonts, async ([file, url]) =>
              writeFile(join(folder, file), await download(url)),
            ),
          )
        },
      },
      { server: false },
    )
  },
})

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}
