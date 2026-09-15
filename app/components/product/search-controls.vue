<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { SORT_OPTIONS, type SortOption } from '#shared/domain/search'

/**
 * The search term and the sort order.
 *
 * Together because they are the two controls that reorder or narrow the list
 * from above it, and because both write to the URL, but they get there
 * differently and that difference is the reason this is a component rather
 * than markup in the page.
 */

const { query, setSearchTerm, setSort } = useProductQuery()

/**
 * The one control that does not write straight to the URL.
 *
 * Every keystroke would otherwise become a history entry, and the back button
 * would replay the word letter by letter. So it is debounced, and watched in
 * the other direction too, because the URL can change from somewhere this
 * component cannot see: the back button, a pasted link, Clear all.
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

/**
 * Writable so the select can bind to it directly. The getter reads the URL and
 * the setter writes back through the router, which keeps the address bar as the
 * only place this value lives.
 */
const sortValue = computed<SortOption>({
  get: () => query.value.sort,
  set: (value) => {
    setSort(value)
  },
})
</script>

<template>
  <div class="flex flex-col gap-3 border-b border-edge-subtle p-3 sm:flex-row sm:items-center">
    <div class="flex-1">
      <label for="product-search" class="sr-only">Search products</label>
      <input
        id="product-search"
        v-model="term"
        type="search"
        placeholder="Search by name, brand or ingredient"
        class="w-full rounded-control border border-edge bg-surface-raised px-3 py-2 text-body text-ink placeholder:text-ink-subtle"
      />
    </div>

    <UiSelectField v-model="sortValue" label="Sort" :options="SORT_OPTIONS" />
  </div>
</template>
