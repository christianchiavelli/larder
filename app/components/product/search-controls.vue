<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { SORT_OPTIONS, type ProductQuery, type SortOption } from '#shared/domain/search'
import type { TaxonomyName } from '#shared/domain/taxonomy'

/**
 * The input is a combobox whose listbox offers filters, not search terms, so
 * the term and its suggestions are one control.
 */

const { query, apply, setSearchTerm, setSort } = useProductQuery()

/**
 * Debounced, or every keystroke is a history entry and the back button replays
 * the word letter by letter. Watched both ways, because the URL also changes
 * from the back button, a pasted link, or Clear all.
 */
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

/** Getter reads the URL, setter writes through the router. */
const sortValue = computed<SortOption>({
  get: () => query.value.sort,
  set: (value) => {
    setSort(value)
  },
})

/* -- Suggestions ----------------------------------------------------------- */

/**
 * Only taxonomies that are also filter dimensions. Upstream autocompletes
 * `additive` too, and choosing one would do nothing.
 */
const FILTERABLE = ['category', 'brand', 'country', 'label'] as const
type FilterableTaxonomy = (typeof FILTERABLE)[number]

function isFilterable(taxonomy: TaxonomyName | string): taxonomy is FilterableTaxonomy {
  return (FILTERABLE as readonly string[]).includes(taxonomy)
}

const { state } = useSuggestions(term)

const isOpen = ref(false)
/** -1 is the input itself. */
const activeIndex = ref(-1)
const listboxId = useId()

const options = computed(() =>
  (state.value.data ?? [])
    .filter((suggestion) => isFilterable(suggestion.taxonomy))
    // Already applied: offering it again presents a no-op as a choice.
    .filter(
      (suggestion) =>
        !query.value[suggestion.taxonomy as FilterableTaxonomy].includes(suggestion.id),
    ),
)

const isExpanded = computed(() => isOpen.value && options.value.length > 0)

const activeOptionId = computed(() =>
  activeIndex.value >= 0 ? `${listboxId}-option-${activeIndex.value}` : undefined,
)

/**
 * Watched by contents, not by reference: `options` rebuilds on every evaluation,
 * so watching the array cleared the highlight between a keypress and the Enter
 * after it. The listbox looked correct and the keyboard did nothing.
 */
watch(
  () => options.value.map((option) => option.id).join(','),
  () => {
    activeIndex.value = -1
  },
)

/**
 * The term is cleared in the same patch as the filter, or both narrow and the
 * reader gets the intersection of a filter they chose and a word they were
 * only typing to find it.
 */
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
  // Wraps through -1, so up from the first option returns to the input.
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
      // Otherwise Enter belongs to the form; the debounce already applied it.
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

      <!--
        A combobox in the ARIA sense: the input owns a listbox, and the active
        option is pointed at rather than focused, so focus never leaves the
        input and typing continues to work while the list is open.
      -->
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
