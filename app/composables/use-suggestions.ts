import { useQuery } from '@pinia/colada'
import { fetchSuggestions } from '~/api/products'

/**
 * Taxonomy autocomplete for the search box.
 *
 * Keyed on the trimmed, lowercased term, so the burst a typist generates
 * collapses into one request per distinct prefix and backspacing over a word
 * costs nothing: every prefix on the way back is already in the cache.
 *
 * Taxonomies change on the order of weeks, which is the longest stale time
 * anything in this app gets. The route behind it caches for a day.
 */

/** Below this, a term matches most of a taxonomy and suggests nothing useful. */
export const MIN_SUGGEST_LENGTH = 2

export function useSuggestions(term: Ref<string>) {
  const prefix = computed(() => term.value.trim().toLowerCase())
  const isLongEnough = computed(() => prefix.value.length >= MIN_SUGGEST_LENGTH)

  return useQuery({
    key: () => ['suggest', prefix.value],
    query: () => fetchSuggestions(prefix.value),
    enabled: () => isLongEnough.value,
    staleTime: 1000 * 60 * 60,

    /**
     * Holds the previous list while the next one loads.
     *
     * Without it the listbox empties on every keystroke and reappears a moment
     * later, so the option under the pointer moves out from under it. A list
     * one character stale is better than a list that is not there.
     */
    placeholderData: (previous) => previous,
  })
}
