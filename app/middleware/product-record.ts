import { useQueryCache } from '@pinia/colada'
import { languageSchema } from '#shared/domain/language'

/** Past this the record is late rather than slow, and the page opens on its skeleton. */
const LONGEST_WAIT_MS = 3_000

/**
 * Keeps the list on screen, under the progress bar, until the product's record is here, so the
 * page opens whole: a name that runs to three lines on a phone lands with the page instead of
 * pushing it down a moment later. The list's own copy of the product cannot stand in for the
 * record meanwhile, since the search index disagrees with it on most products, down to the
 * length of the name (docs/upstream-api.md).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()
  // The server renders the record into the page, and hydration finds it there.
  if (import.meta.server || nuxtApp.isHydrating) return

  // The language's own middleware runs first, so this is already the page's language.
  const language = languageSchema.parse(nuxtApp.$i18n.locale.value)
  const queryCache = useQueryCache()
  const entry = queryCache.ensure(productDetailQuery({ code: String(to.params.code), language }))
  // A copy from earlier opens at once, and the page refreshes it in place.
  if (entry.state.value.data !== undefined) return

  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<void>((resolve) => (timer = setTimeout(resolve, LONGEST_WAIT_MS)))
  // A failure is the page's to report, with its retry, so it lets the navigation through.
  await Promise.race([queryCache.refresh(entry).catch(() => {}), late])
  clearTimeout(timer)
})
