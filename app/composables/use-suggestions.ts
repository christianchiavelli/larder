import { useQuery } from '@pinia/colada'
import { computed, type Ref } from 'vue'
import { DEFAULT_SUGGEST_TAXONOMIES, fetchSuggestions } from '~/api/products'
import type { TaxonomyName } from '#shared/domain/taxonomy'

const MIN_SUGGEST_LENGTH = 2

export function useSuggestions(
  term: Ref<string>,
  taxonomies: readonly TaxonomyName[] = DEFAULT_SUGGEST_TAXONOMIES,
) {
  const prefix = computed(() => term.value.trim().toLowerCase())
  const isLongEnough = computed(() => prefix.value.length >= MIN_SUGGEST_LENGTH)

  return useQuery({
    key: () => ['suggest', taxonomies.join(','), prefix.value],
    query: () => fetchSuggestions(prefix.value, taxonomies),
    enabled: () => isLongEnough.value,
    staleTime: 1000 * 60 * 60,

    placeholderData: (previous) => previous,
  })
}
