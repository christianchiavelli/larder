<script setup lang="ts">
import {
  EMPTY_PRODUCT_QUERY,
  catalogueSize,
  classifiedShare,
  gradedShare,
  type NutriScoreDistribution,
} from '#shared/domain/search'
import type { NovaGroup, NutriScore } from '#shared/domain/nutrition'

/**
 * The front page: what the catalogue is, and three ways into it.
 *
 * No title of its own, so the head falls back to the site name and its
 * description rather than reading "Home | Larder".
 */

const query = computed(() => ({ ...EMPTY_PRODUCT_QUERY, sort: 'popularity' as const }))
const { state, asyncStatus } = useProductSearch(query)

const result = computed(() => state.value.data)
const isLoading = computed(() => asyncStatus.value === 'loading' && !result.value)

const distribution = computed<NutriScoreDistribution>(
  () => result.value?.nutriScoreDistribution ?? {},
)

const figures = computed(() => {
  const total = catalogueSize(distribution.value)
  if (total === null || !result.value) return null

  return {
    total,
    graded: gradedShare(distribution.value),
    classified: classifiedShare(distribution.value, result.value.novaClassifiedCount),
  }
})

/** Eight of the page of twenty-four the search already returns. */
const featured = computed(() => result.value?.items.slice(0, 8) ?? [])

const term = ref('')

function search() {
  const q = term.value.trim()
  return navigateTo({ path: '/products', query: q ? { q } : {} })
}

/**
 * Filters rather than search terms, because a filter is the thing this catalogue
 * can do that a search box cannot: each of these is a facet of the whole
 * population, and the third is the largest group in it.
 *
 * Typed against the domain, so renaming a grade breaks the build rather than
 * producing a link that applies nothing.
 */
const EXAMPLES = [
  { label: 'Nutri-Score A', query: { nutriScore: 'a' satisfies NutriScore } },
  { label: 'Ultra-processed', query: { nova: String(4 satisfies NovaGroup) } },
  { label: 'No grade on record', query: { nutriScore: 'unknown' satisfies NutriScore } },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiGradientHero>
      <h1 class="font-serif text-[2.5rem] leading-tight font-semibold text-chrome-ink-strong">
        Larder
      </h1>

      <p class="mt-2 max-w-xl text-body text-chrome-ink">
        Nutrition, processing and labelling across a public catalogue of packaged food.
      </p>

      <!-- The figures land late and the line is kept at its full height either
           way, so the search below it does not jump under the pointer. -->
      <p class="mt-4 flex min-h-5 items-center gap-2 text-caption text-chrome-ink">
        <template v-if="figures">
          <span data-numeric>{{ formatCount(figures.total) }}</span>
          <span>products</span>
          <span aria-hidden="true">·</span>
          <span data-numeric>{{ figures.graded?.toFixed(1) }}%</span>
          <span>carry a Nutri-Score</span>
          <span aria-hidden="true">·</span>
          <span data-numeric>{{ figures.classified?.toFixed(1) }}%</span>
          <span>a NOVA group</span>
        </template>
      </p>

      <form class="mt-6 flex w-full max-w-xl gap-2" role="search" @submit.prevent="search">
        <label for="hero-search" class="sr-only">Search the catalogue</label>
        <input
          id="hero-search"
          v-model="term"
          type="search"
          placeholder="Search a product, brand or category"
          class="min-w-0 flex-1 rounded-control border border-chrome-raised bg-chrome-raised px-4 py-3 text-body text-chrome-ink-strong placeholder:text-chrome-ink focus-visible:border-edge-accent focus-visible:outline-none"
        />
        <button
          type="submit"
          class="shrink-0 rounded-control bg-accent px-5 text-label text-ink-on-accent transition-colors hover:bg-accent-hover motion-reduce:transition-none"
        >
          Search
        </button>
      </form>

      <ul class="mt-4 flex flex-wrap justify-center gap-2">
        <li v-for="example in EXAMPLES" :key="example.label">
          <NuxtLink
            :to="{ path: '/products', query: example.query }"
            class="inline-flex rounded-pill border border-chrome-raised px-3 py-1.5 text-caption text-chrome-ink transition-colors hover:border-edge-accent hover:text-chrome-ink-strong motion-reduce:transition-none"
          >
            {{ example.label }}
          </NuxtLink>
        </li>
      </ul>
    </UiGradientHero>

    <section data-scroll-section class="flex scroll-mt-6 flex-col gap-3">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-heading text-ink">Most scanned</h2>
        <NuxtLink
          to="/products?sort=popularity"
          class="inline-flex items-center gap-1.5 text-label text-ink-muted hover:text-ink-accent"
        >
          See all
          <UiIcon name="chevron-right" class="size-2.5" />
        </NuxtLink>
      </div>

      <ul class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <template v-if="isLoading">
          <li v-for="placeholder in 8" :key="placeholder">
            <UiSkeleton class="aspect-[4/3] w-full rounded-card" />
          </li>
        </template>

        <ProductCard v-for="product in featured" v-else :key="product.code" :product="product" />
      </ul>
    </section>
  </div>
</template>
