<script setup lang="ts">
import { withoutDimension, type ProductQuery, type TagDimension } from '#shared/domain/search'
import { toFilterValue } from '#shared/domain/taxonomy'

const props = defineProps<{
  taxonomy: TagDimension
  scope: ProductQuery
}>()

const selected = defineModel<{ value: string; label: string }[]>({ required: true })

const MIN_SEARCH_LENGTH = 2

const { t } = useI18n()
// Whole sentences per dimension, never a noun dropped into one: "Todas as marcas", "Todos os países".
const words = (
  key: 'all' | 'allIncluded' | 'failed' | 'loading' | 'name' | 'noMatch' | 'none' | 'search',
) => t(`dimensions.${props.taxonomy}.${key}`)
const search = ref('')
const isOpen = ref(false)

const scopeWithoutSelf = computed(() => withoutDimension(props.scope, props.taxonomy))
const facet = useProductFacet(props.taxonomy, scopeWithoutSelf, () => isOpen.value)
const suggestions = useSuggestions(search, [props.taxonomy])

// Folded, so a country typed without its accents still matches: "franca" finds "França".
const term = computed(() => foldForSearch(search.value.trim()))

const inThisSearch = computed(() =>
  (facet.state.value.data ?? []).map((item) => ({
    value: toFilterValue(props.taxonomy, item.key),
    label: item.label,
    count: item.count,
  })),
)

const options = computed(() => {
  if (!term.value) return inThisSearch.value

  const matching = inThisSearch.value.filter((option) =>
    foldForSearch(option.label).includes(term.value),
  )
  if (term.value.length < MIN_SEARCH_LENGTH) return matching

  const listed = new Set(matching.map((option) => option.value))
  const elsewhere = (suggestions.state.value.data ?? [])
    .map((suggestion) => ({
      value: toFilterValue(props.taxonomy, suggestion.id),
      label: suggestion.label,
    }))
    .filter((option) => !listed.has(option.value))

  return [...matching, ...elsewhere]
})

const loading = computed(() =>
  term.value
    ? suggestions.isTyping.value || suggestions.asyncStatus.value === 'loading'
    : facet.asyncStatus.value === 'loading',
)

const status = computed(() => {
  if (options.value.length > 0) return null
  if (loading.value) return term.value ? t('export.searching') : words('loading')
  if (term.value) return words('noMatch')
  if (facet.state.value.status === 'error') return words('failed')
  return words('none')
})
</script>

<template>
  <UiCombobox
    v-model="selected"
    v-model:search="search"
    v-model:open="isOpen"
    :label="words('name')"
    :placeholder="words('all')"
    :all-label="words('allIncluded')"
    :search-label="words('search')"
    :options="options"
    :status="status"
    :loading="loading"
  />
</template>
