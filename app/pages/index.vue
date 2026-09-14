<script setup lang="ts">
import { EMPTY_PRODUCT_QUERY } from '#shared/domain/search'
import { NUTRI_SCORE_GRADES, type NutriScore } from '#shared/domain/nutrition'

useHead({ title: 'Overview' })

/**
 * Catalogue overview.
 *
 * Reads the unfiltered search, which already returns facet counts across the
 * whole match set. A dedicated aggregation endpoint would be a second thing to
 * cache, rate-limit and keep consistent with the directory, to serve numbers
 * the directory's own response already carries.
 */
const query = computed(() => EMPTY_PRODUCT_QUERY)
const { state, asyncStatus, refresh } = useProductSearch(query)

const result = computed(() => state.value.data)
const error = computed(() => state.value.error)
const isLoading = computed(() => asyncStatus.value === 'loading' && !result.value)

// Annotated because the empty-object fallback would otherwise narrow the
// whole type to `{}` and make every grade lookup an implicit any.
const distribution = computed<Partial<Record<NutriScore, number>>>(
  () => result.value?.nutriScoreDistribution ?? {},
)

const graded = computed(() =>
  NUTRI_SCORE_GRADES.reduce((sum, grade) => sum + (distribution.value[grade] ?? 0), 0),
)

/**
 * Population size, taken from the facet buckets rather than the hit count.
 *
 * These are different numbers describing different things. Elasticsearch stops
 * tracking hits at 10,000 and pins `totalCount` there, but it still aggregates
 * over every matching document, so the facets are real totals across the whole
 * catalogue. Feeding a headline figure from `totalCount` while the chart beside
 * it is drawn from the facets would put 10,000 and 3.5 million on the same
 * screen as if they measured the same population.
 */
const catalogueSize = computed(() => {
  const total = graded.value + (distribution.value.unknown ?? 0)
  return total === 0 ? null : total
})

const scored = computed(() => {
  const total = catalogueSize.value
  return total === null ? null : (graded.value / total) * 100
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-display text-ink">Larder</h1>
      <p class="max-w-prose text-body text-ink-muted">
        Nutrition, processing and labelling across a public catalogue of packaged food. Data comes
        from Open Food Facts, where every record is contributed by the public.
      </p>
    </header>

    <UiEmptyState
      v-if="error"
      tone="error"
      title="Could not load the overview"
      :description="error.message"
      @retry="refresh()"
    />

    <template v-else>
      <UiSurfaceCard>
        <div class="grid gap-6 sm:grid-cols-3">
          <UiStatTile
            label="Products graded"
            :value="catalogueSize"
            size="lg"
            :loading="isLoading"
            caption="Across the whole catalogue"
          />
          <UiStatTile
            label="Carry a Nutri-Score"
            :value="scored"
            unit="%"
            :precision="1"
            size="lg"
            :loading="isLoading"
            caption="The rest have no grade on record"
          />
          <UiStatTile
            label="Categories represented"
            :value="result?.facets.categories_tags?.length ?? null"
            size="lg"
            :loading="isLoading"
            caption="Returned by the facet response"
          />
        </div>
      </UiSurfaceCard>

      <div class="grid gap-4 lg:grid-cols-2">
        <UiSurfaceCard>
          <h2 class="mb-1 text-heading text-ink">Nutri-Score distribution</h2>
          <p class="mb-3 text-caption text-ink-subtle">
            Products with no grade are shown, not excluded.
          </p>
          <ProductNutriScoreChart :distribution="distribution" :loading="isLoading" />
        </UiSurfaceCard>

        <UiSurfaceCard>
          <h2 class="mb-1 text-heading text-ink">Largest categories</h2>
          <p class="mb-3 text-caption text-ink-subtle">
            By number of products across the catalogue.
          </p>
          <ProductFacetChart
            title="Categories"
            :items="result?.facets.categories_tags ?? []"
            :loading="isLoading"
          />
        </UiSurfaceCard>

        <UiSurfaceCard class="lg:col-span-2">
          <h2 class="mb-1 text-heading text-ink">Most represented brands</h2>
          <p class="mb-3 text-caption text-ink-subtle">
            Brand names are contributed as free text, so spellings of the same brand can appear
            separately.
          </p>
          <ProductFacetChart
            title="Brands"
            :items="result?.facets.brands_tags ?? []"
            :limit="12"
            :loading="isLoading"
          />
        </UiSurfaceCard>
      </div>

      <UiSurfaceCard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-heading text-ink">Browse the catalogue</h2>
            <p class="text-body text-ink-muted">
              Filter by category, brand, nutrition grade and processing level.
            </p>
          </div>
          <NuxtLink
            to="/products"
            class="rounded-control bg-accent px-4 py-2 text-label text-ink-on-accent transition-colors hover:bg-accent-hover motion-reduce:transition-none"
          >
            Open the directory
          </NuxtLink>
        </div>
      </UiSurfaceCard>
    </template>
  </div>
</template>
