import { useQuery } from '@pinia/colada'
import { computed, type Ref } from 'vue'
import { fetchSuggestions } from '~/api/products'

/**
 * Keyed on the trimmed, lowercased term, so a typing burst collapses into one
 * request per distinct prefix and backspacing costs nothing.
 */

/** Below this, a term matches most of a taxonomy and suggests nothing useful. */
const MIN_SUGGEST_LENGTH = 2

export function useSuggestions(term: Ref<string>) {
  const prefix = computed(() => term.value.trim().toLowerCase())
  const isLongEnough = computed(() => prefix.value.length >= MIN_SUGGEST_LENGTH)

  return useQuery({
    key: () => ['suggest', prefix.value],
    query: () => fetchSuggestions(prefix.value),
    enabled: () => isLongEnough.value,
    staleTime: 1000 * 60 * 60,

    /**
     * Holds the previous list while the next loads, or the listbox empties on every
     * keystroke and the option under the pointer moves away.
     */
    placeholderData: (previous) => previous,
  })
}
