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
 * No title of its own, so the head falls back to the bare site name rather
 * than reading "Home | Larder".
 */

definePageMeta({
  // `true` rather than `'always'`: at this setting Nuxt skips the transition
  // itself under `prefers-reduced-motion: reduce`.
  viewTransition: true,
  // Otherwise both run: the Vue fade dips the whole page while the browser is
  // mid-morph, and the tile travels through a screen that is going grey.
  pageTransition: false,
})

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
 * Filters rather than search terms, because a filter is what this catalogue can
 * do that a search box cannot. Each carries its own size, read off the same
 * facets the figures above come from, so a card states what it will return
 * instead of promising something.
 *
 * Typed against the domain, so renaming a grade breaks the build rather than
 * producing a link that applies nothing.
 */
const EXAMPLES = [
  {
    dimension: 'Nutri-Score',
    label: 'Graded A',
    detail: 'The best grade the scheme gives',
    query: { nutriScore: 'a' satisfies NutriScore },
    count: () => distribution.value.a,
  },
  {
    dimension: 'Processing',
    label: 'Ultra-processed',
    detail: 'NOVA group 4, the most processed',
    query: { nova: String(4 satisfies NovaGroup) },
    count: () => result.value?.novaDistribution[4],
  },
  {
    dimension: 'Nutri-Score',
    label: 'No grade on record',
    detail: 'The largest group in the catalogue',
    query: { nutriScore: 'unknown' satisfies NutriScore },
    count: () => distribution.value.unknown,
  },
]
</script>

<template>
  <div>
    <UiGradientHero>
      <h1
        class="max-w-3xl font-serif text-[2rem] leading-[1.15] font-semibold text-ink sm:text-[2.75rem] sm:leading-[1.1] lg:text-[3.25rem]"
      >
        Every packaged food, measured the same way
      </h1>

      <p class="mt-4 max-w-xl text-lead text-ink-muted">
        Nutrition, processing and labelling across a public catalogue of
        <span data-numeric class="text-ink">{{
          figures ? formatCount(figures.total) : '3.5 million'
        }}</span>
        products.
      </p>

      <!-- Stacked below `sm`: side by side, the button takes enough width from a
           375px screen that the placeholder is cut mid-word. -->
      <form
        class="mt-8 flex w-full max-w-2xl flex-col gap-2 sm:flex-row"
        role="search"
        @submit.prevent="search"
      >
        <label for="hero-search" class="sr-only">Search the catalogue</label>
        <div class="relative min-w-0 flex-1">
          <UiIcon
            name="search"
            class="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="hero-search"
            v-model="term"
            type="search"
            placeholder="Search a product, brand or category"
            class="w-full rounded-control border border-edge bg-surface-raised py-3.5 pr-4 pl-11 text-body text-ink shadow-raised placeholder:text-ink-subtle focus-visible:border-edge-accent focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          class="shrink-0 rounded-control bg-accent px-6 py-3 text-label text-ink-on-accent shadow-raised transition-colors hover:bg-accent-hover sm:py-0"
        >
          Search
        </button>
      </form>

      <!--
        The examples carry their own size. A card that says how many products
        it will return is the difference between showing what the catalogue is
        and advertising that it has filters.
      -->
      <ul class="mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-3">
        <li v-for="example in EXAMPLES" :key="example.label">
          <NuxtLink
            :to="{ path: '/products', query: example.query }"
            class="group flex h-full flex-col gap-1 rounded-card border border-edge-subtle bg-surface-raised/80 p-4 text-left backdrop-blur-sm transition-colors hover:border-edge-accent"
          >
            <span class="text-overline text-ink-subtle">{{ example.dimension }}</span>
            <span class="text-subheading text-ink group-hover:text-ink-accent">
              {{ example.label }}
            </span>
            <span class="text-caption text-ink-muted">{{ example.detail }}</span>
            <!-- Reserved either way, so the cards do not resize under the pointer
                 when the counts land. -->
            <span class="mt-1 min-h-4 text-caption text-ink-subtle">
              <template v-if="example.count() !== undefined">
                <span data-numeric>{{ formatCountCompact(example.count()!) }}</span>
                products
              </template>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </UiGradientHero>

    <UiPageContainer>
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

          <ProductCard
            v-for="product in featured"
            v-else
            :key="product.code"
            :product="product"
            class="reveal"
          />
        </ul>
      </section>
    </UiPageContainer>
  </div>
</template>
