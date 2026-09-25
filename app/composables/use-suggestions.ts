import { useQuery } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { computed, type Ref } from 'vue'
import { DEFAULT_SUGGEST_TAXONOMIES, fetchSuggestions } from '~/api/products'
import type { TaxonomyName } from '#shared/domain/taxonomy'

const MIN_SUGGEST_LENGTH = 2
const TYPING_PAUSE_MS = 200

export function useSuggestions(
  term: Ref<string>,
  taxonomies: readonly TaxonomyName[] = DEFAULT_SUGGEST_TAXONOMIES,
) {
  const typed = computed(() => term.value.trim().toLowerCase())
  const prefix = refDebounced(typed, TYPING_PAUSE_MS)
  const isLongEnough = computed(() => prefix.value.length >= MIN_SUGGEST_LENGTH)

  const suggestions = useQuery({
    key: () => ['suggest', taxonomies.join(','), prefix.value],
    query: () => fetchSuggestions(prefix.value, taxonomies),
    enabled: () => isLongEnough.value,
    staleTime: 1000 * 60 * 60,

    placeholderData: (previous) => previous,
  })

  const isTyping = computed(
    () => typed.value !== prefix.value && typed.value.length >= MIN_SUGGEST_LENGTH,
  )

  return { ...suggestions, isTyping }
}
