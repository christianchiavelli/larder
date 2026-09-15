<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { NUTRI_SCORE_GRADES, NOVA_GROUPS, NOVA_SHORT_LABELS } from '#shared/domain/nutrition'
import { SORT_OPTIONS, activeFilterCount, hasActiveFilters } from '#shared/domain/search'

useHead({ title: 'Products' })

const {
  query,
  setSearchTerm,
  setSort,
  setPage,
  toggleTag,
  toggleNutriScore,
  toggleNova,
  clearFilters,
} = useProductQuery()

const { state, asyncStatus, refresh } = useProductSearch(query)

/**
 * The search box is the one control that does not write straight to the URL.
 *
 * Every keystroke would otherwise become a history entry, and the back button
 * would replay the word letter by letter. Debounced, and kept in sync when the
 * URL changes from anywhere else, such as the back button or a pasted link.
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

const result = computed(() => state.value.data)
const isLoading = computed(() => asyncStatus.value === 'loading')
const error = computed(() => state.value.error)

const numberFormatter = new Intl.NumberFormat('en')

/**
 * Upstream stops counting at its tracking ceiling, so past that point the
 * figure is a floor rather than a total. Printing it plainly would be stating a
 * number we know to be wrong.
 */
const totalLabel = computed(() => {
  if (!result.value) return null
  const formatted = numberFormatter.format(result.value.totalCount)
  return result.value.isTotalExact ? formatted : `${formatted}+`
})

const filterCount = computed(() => activeFilterCount(query.value))
const showingFilters = computed(() => hasActiveFilters(query.value))
</script>

<template>
  <div>
    <UiPageHeader
      title="Products"
      description="Search a public catalogue of packaged food by category, brand, nutrition grade and processing level."
    />

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <aside class="flex shrink-0 flex-col gap-5 lg:w-[17rem]" aria-label="Filters">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-subheading text-ink">
            Filters
            <span v-if="filterCount > 0" class="text-label text-ink-subtle" data-numeric>
              ({{ filterCount }})
            </span>
          </h2>
          <button
            v-if="showingFilters"
            type="button"
            class="text-caption text-ink-accent underline underline-offset-2"
            @click="clearFilters()"
          >
            Clear all
          </button>
        </div>

        <fieldset class="border-0 p-0">
          <legend class="mb-2 text-overline text-ink-subtle uppercase">Nutri-Score</legend>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="grade in NUTRI_SCORE_GRADES"
              :key="grade"
              type="button"
              class="rounded-control border p-0.5 transition-colors motion-reduce:transition-none"
              :class="
                query.nutriScore.includes(grade)
                  ? 'border-edge-accent bg-surface-accent'
                  : 'border-transparent hover:border-edge'
              "
              :aria-pressed="query.nutriScore.includes(grade)"
              @click="toggleNutriScore(grade)"
            >
              <UiNutriScoreBadge :grade="grade" size="sm" />
            </button>
          </div>
        </fieldset>

        <fieldset class="border-0 p-0">
          <legend class="mb-2 text-overline text-ink-subtle uppercase">Processing (NOVA)</legend>
          <div class="flex flex-col gap-1">
            <label
              v-for="group in NOVA_GROUPS"
              :key="group"
              class="flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                class="size-4 shrink-0 accent-accent"
                :checked="query.nova.includes(group)"
                @change="toggleNova(group)"
              />
              <UiNovaBadge :group="group" />
              <span class="text-label text-ink">{{ NOVA_SHORT_LABELS[group] }}</span>
            </label>
          </div>
        </fieldset>

        <ProductFilterGroup
          title="Category"
          :items="result?.facets.categories_tags ?? []"
          :selected="query.category"
          :loading="isLoading && !result"
          @toggle="toggleTag('category', $event)"
        />

        <ProductFilterGroup
          title="Brand"
          :items="result?.facets.brands_tags ?? []"
          :selected="query.brand"
          :loading="isLoading && !result"
          @toggle="toggleTag('brand', $event)"
        />

        <ProductFilterGroup
          title="Country"
          :items="result?.facets.countries_tags ?? []"
          :selected="query.country"
          :loading="isLoading && !result"
          @toggle="toggleTag('country', $event)"
        />
      </aside>

      <!--
        The results live on a raised panel, and the rows sit on the recessed
        surface inside it. Three levels rather than two: without the middle one
        a white row on a white panel has only its border to separate it, and the
        list reads as a single block of text.
      -->
      <div
        class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-edge-subtle bg-surface-raised shadow-card"
      >
        <div
          class="flex flex-col gap-3 border-b border-edge-subtle p-3 sm:flex-row sm:items-center"
        >
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

          <div class="flex items-center gap-2">
            <label for="product-sort" class="shrink-0 text-label text-ink-muted">Sort</label>
            <select
              id="product-sort"
              class="rounded-control border border-edge bg-surface-raised px-2 py-2 text-label text-ink"
              :value="query.sort"
              @change="setSort(($event.target as HTMLSelectElement).value as never)"
            >
              <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!--
          Politely announced, so a screen reader hears the new count after a
          filter change instead of the results silently replacing themselves.
        -->
        <p
          class="border-b border-edge-subtle bg-surface px-3 py-2 text-caption text-ink-muted"
          aria-live="polite"
          data-testid="result-summary"
        >
          <template v-if="totalLabel">
            <span data-numeric>{{ totalLabel }}</span>
            {{ result!.totalCount === 1 ? 'product' : 'products' }}
            <span v-if="!result!.isTotalExact" class="text-ink-subtle">
              (upstream stops counting at 10,000)
            </span>
          </template>
          <UiSkeleton v-else class="h-4 w-32" />
        </p>

        <div class="flex flex-1 flex-col gap-2 bg-surface p-2">
          <UiEmptyState
            v-if="error"
            tone="error"
            title="Could not load products"
            :description="error.message"
            @retry="refresh()"
          />

          <UiEmptyState
            v-else-if="result && result.items.length === 0"
            title="No products match these filters"
            description="Try removing a filter or searching for a broader term."
          >
            <button
              v-if="showingFilters"
              type="button"
              class="mt-2 rounded-control border border-edge-strong px-3 py-1.5 text-label text-ink hover:bg-surface-hover"
              @click="clearFilters()"
            >
              Clear all filters
            </button>
          </UiEmptyState>

          <template v-else>
            <!--
            Dimmed rather than replaced while refetching. `placeholderData`
            holds the previous page, so the list keeps its height and the
            reader keeps their place instead of the layout collapsing.
          -->
            <ul
              class="flex flex-col gap-1.5 transition-opacity motion-reduce:transition-none"
              :class="isLoading && 'opacity-60'"
            >
              <li v-for="product in result?.items ?? []" :key="product.code">
                <ProductRow :product="product" />
              </li>

              <li v-for="index in result ? 0 : 8" :key="`skeleton-${index}`">
                <UiSkeleton rounded="card" class="h-[4.5rem] w-full" />
              </li>
            </ul>
          </template>
        </div>

        <div
          v-if="result && result.pageCount > 1"
          class="border-t border-edge-subtle bg-surface-raised p-3"
        >
          <UiPagination
            :page="result.page"
            :page-count="result.pageCount"
            :disabled="isLoading"
            @change="setPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
