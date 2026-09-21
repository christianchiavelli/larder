<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { SORT_OPTIONS, type ProductQuery, type SortOption } from '#shared/domain/search'
import type { TaxonomyName } from '#shared/domain/taxonomy'

const { query, apply, setSearchTerm, setSort } = useProductQuery()

const term = ref(query.value.q)

watch(
  () => query.value.q,
  (value) => {
    if (value !== term.value) term.value = value
  },
)

watchDebounced(
  term,
  (value) => {
    if (value !== query.value.q) setSearchTerm(value)
  },
  { debounce: 350 },
)

const sortValue = computed<SortOption>({
  get: () => query.value.sort,
  set: (value) => {
    setSort(value)
  },
})

const FILTERABLE = ['category', 'brand', 'country', 'label'] as const
type FilterableTaxonomy = (typeof FILTERABLE)[number]

function isFilterable(taxonomy: TaxonomyName | string): taxonomy is FilterableTaxonomy {
  return (FILTERABLE as readonly string[]).includes(taxonomy)
}

const { state } = useSuggestions(term)

const isOpen = ref(false)
const activeIndex = ref(-1)
const listboxId = useId()

const options = computed(() =>
  (state.value.data ?? [])
    .filter((suggestion) => isFilterable(suggestion.taxonomy))
    .filter(
      (suggestion) =>
        !query.value[suggestion.taxonomy as FilterableTaxonomy].includes(suggestion.id),
    ),
)

const isExpanded = computed(() => isOpen.value && options.value.length > 0)

const activeOptionId = computed(() =>
  activeIndex.value >= 0 ? `${listboxId}-option-${activeIndex.value}` : undefined,
)

watch(
  () => options.value.map((option) => option.id).join(','),
  () => {
    activeIndex.value = -1
  },
)

function select(index: number) {
  const suggestion = options.value[index]
  if (!suggestion || !isFilterable(suggestion.taxonomy)) return

  const dimension = suggestion.taxonomy
  const current = query.value[dimension]

  term.value = ''
  isOpen.value = false
  activeIndex.value = -1

  apply({ q: '', [dimension]: [...current, suggestion.id] } as Partial<ProductQuery>)
}

function move(delta: number) {
  if (!isExpanded.value) {
    isOpen.value = true
    return
  }

  const count = options.value.length
  activeIndex.value = ((activeIndex.value + 1 + delta + count + 1) % (count + 1)) - 1
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Enter':
      if (isExpanded.value && activeIndex.value >= 0) {
        event.preventDefault()
        select(activeIndex.value)
      }
      break
    case 'Escape':
      if (isExpanded.value) {
        event.preventDefault()
        isOpen.value = false
        activeIndex.value = -1
      }
      break
    case 'Tab':
      isOpen.value = false
      break
  }
}

function labelFor(taxonomy: FilterableTaxonomy): string {
  return { category: 'Category', brand: 'Brand', country: 'Country', label: 'Label' }[taxonomy]
}
</script>

<template>
  <div class="flex flex-col gap-3 border-b border-edge-subtle p-3 sm:flex-row sm:items-center">
    <div class="relative flex-1">
      <label for="product-search" class="sr-only">Search products</label>

      <input
        id="product-search"
        v-model="term"
        type="search"
        role="combobox"
        placeholder="Search by name, brand or ingredient"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isExpanded"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        class="w-full rounded-control border border-edge bg-surface-raised px-3 py-2 text-body text-ink placeholder:text-ink-subtle"
        @focus="isOpen = true"
        @blur="isOpen = false"
        @keydown="onKeydown"
      />

      <ul
        v-show="isExpanded"
        :id="listboxId"
        role="listbox"
        aria-label="Filter suggestions"
        class="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-card border border-edge bg-surface-overlay py-1 shadow-overlay"
      >
        <li
          v-for="(suggestion, index) in options"
          :id="`${listboxId}-option-${index}`"
          :key="suggestion.id"
          role="option"
          :aria-selected="index === activeIndex"
          class="flex cursor-pointer items-baseline gap-2 px-3 py-1.5"
          :class="index === activeIndex ? 'bg-surface-hover text-ink-accent' : 'text-ink'"
          @mouseenter="activeIndex = index"
          @mousedown.prevent="select(index)"
        >
          <span class="truncate text-label">{{ suggestion.label }}</span>
          <span class="ml-auto shrink-0 text-caption text-ink-subtle">
            {{ labelFor(suggestion.taxonomy as FilterableTaxonomy) }}
          </span>
        </li>
      </ul>
    </div>

    <UiSelectField v-model="sortValue" label="Sort" :options="SORT_OPTIONS" />
  </div>
</template>
