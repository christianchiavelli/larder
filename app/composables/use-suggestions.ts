import { useQuery } from '@pinia/colada'
import { computed, type Ref } from 'vue'
import { fetchSuggestions } from '~/api/products'

const MIN_SUGGEST_LENGTH = 2

export function useSuggestions(term: Ref<string>) {
  const prefix = computed(() => term.value.trim().toLowerCase())
  const isLongEnough = computed(() => prefix.value.length >= MIN_SUGGEST_LENGTH)

  return useQuery({
    key: () => ['suggest', prefix.value],
    query: () => fetchSuggestions(prefix.value),
    enabled: () => isLongEnough.value,
    staleTime: 1000 * 60 * 60,

    placeholderData: (previous) => previous,
  })
}
