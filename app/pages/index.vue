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
  // Every bucket, rather than a list of the ones that existed when this was
  // written. Naming them cost 71,025 products the day the ungraded bucket was
  // split in two: nothing failed, the headline simply described a smaller
  // catalogue than the chart beside it, and every percentage on the page was
  // over a population that had quietly shrunk.
  const total = Object.values(distribution.value).reduce((sum, count) => sum + count, 0)
  return total === 0 ? null : total
})

const scored = computed(() => {
  const total = catalogueSize.value
  return total === null ? null : (graded.value / total) * 100
})

/**
 * Share of the catalogue carrying a NOVA group.
 *
 * This tile used to read "Categories represented: 10", which was the number of
 * buckets the facet returns, not a fact about the catalogue: it is ten for
 * every query and would have been ten for an empty one.
 */
const classified = computed(() => {
  const total = catalogueSize.value
  if (total === null || !result.value) return null
  return (result.value.novaClassifiedCount / total) * 100
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiPageHeader
      title="Catalogue overview"
      description="Nutrition, processing and labelling across a public catalogue of packaged food."
    />

    <UiEmptyState
      v-if="error"
      tone="error"
      title="Could not load the overview"
      :description="error.message"
      @retry="refresh()"
    />

    <template v-else>
      <UiSurfaceCard>
        <!-- Divided rather than merely spaced: three figures in a row read as one
             sentence without a rule between them, and these measure different
             things. -->
        <div class="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-edge-subtle">
          <UiStatTile
            class="sm:pr-6"
            label="Products in catalogue"
            :value="catalogueSize"
            size="lg"
            :loading="isLoading"
            caption="Across the whole catalogue"
          />
          <UiStatTile
            class="sm:px-6"
            label="Carry a Nutri-Score"
            :value="scored"
            unit="%"
            :precision="1"
            size="lg"
            :loading="isLoading"
            caption="The rest have no grade on record"
          />
          <UiStatTile
            class="sm:pl-6"
            label="Carry a NOVA group"
            :value="classified"
            unit="%"
            :precision="1"
            size="lg"
            :loading="isLoading"
            caption="The rest are not classified for processing"
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
