<script setup lang="ts">
import { withoutDimension, type ProductQuery, type TagDimension } from '#shared/domain/search'
import { toFilterValue } from '#shared/domain/taxonomy'

const props = defineProps<{
  taxonomy: TagDimension
  scope: ProductQuery
}>()

const selected = defineModel<{ value: string; label: string }[]>({ required: true })

const NOUNS: Record<TagDimension, { singular: string; plural: string }> = {
  category: { singular: 'Category', plural: 'categories' },
  brand: { singular: 'Brand', plural: 'brands' },
  country: { singular: 'Country', plural: 'countries' },
  label: { singular: 'Label', plural: 'labels' },
}

const MIN_SEARCH_LENGTH = 2

const noun = NOUNS[props.taxonomy]
const search = ref('')
const isOpen = ref(false)

const scopeWithoutSelf = computed(() => withoutDimension(props.scope, props.taxonomy))
const facet = useProductFacet(props.taxonomy, scopeWithoutSelf, () => isOpen.value)
const suggestions = useSuggestions(search, [props.taxonomy])

const term = computed(() => search.value.trim().toLowerCase())

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
    option.label.toLowerCase().includes(term.value),
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
  if (loading.value) return term.value ? 'Searching…' : `Loading ${noun.plural}…`
  if (term.value) return `No ${noun.plural} match`
  if (facet.state.value.status === 'error')
    return `Could not list the ${noun.plural}. Type to search.`
  return `No ${noun.plural} in this search`
})
</script>

<template>
  <UiCombobox
    v-model="selected"
    v-model:search="search"
    v-model:open="isOpen"
    :label="noun.singular"
    :placeholder="`All ${noun.plural}`"
    :all-label="`All ${noun.plural} included`"
    :search-label="`Search ${noun.plural}`"
    :options="options"
    :status="status"
    :loading="loading"
  />
</template>
