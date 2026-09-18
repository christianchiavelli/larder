<script setup lang="ts">
import {
  EMPTY_PRODUCT_QUERY,
  catalogueSize as catalogueSizeOf,
  classifiedShare,
  gradedShare,
  type NutriScoreDistribution,
} from '#shared/domain/search'

useHead({ title: 'Overview' })

/**
 * Reads the unfiltered search, which already returns facet counts over the whole
 * match set.
 */
const query = computed(() => EMPTY_PRODUCT_QUERY)
const { state, asyncStatus, refresh } = useProductSearch(query)

const result = computed(() => state.value.data)
const error = computed(() => state.value.error)
const isLoading = computed(() => asyncStatus.value === 'loading' && !result.value)

// Annotated because the empty-object fallback would otherwise narrow the
// whole type to `{}` and make every grade lookup an implicit any.
const distribution = computed<NutriScoreDistribution>(
  () => result.value?.nutriScoreDistribution ?? {},
)

/**
 * From the facet buckets, not the hit count: Elasticsearch pins `totalCount` at
 * 10,000 but still aggregates over every matching document.
 */
const catalogueSize = computed(() => catalogueSizeOf(distribution.value))
const scored = computed(() => gradedShare(distribution.value))

/**
 * This tile used to read "Categories represented: 10", which was the number of
 * buckets a facet page returns, not a fact about the catalogue.
 */
const classified = computed(() =>
  result.value ? classifiedShare(distribution.value, result.value.novaClassifiedCount) : null,
)
</script>

<template>
  <UiPageContainer>
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
        <UiSurfaceCard data-scroll-section class="scroll-mt-6">
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

        <div data-scroll-section class="grid scroll-mt-6 gap-4 lg:grid-cols-2">
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

        <UiSurfaceCard data-scroll-section class="scroll-mt-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-heading text-ink">Browse the catalogue</h2>
              <p class="text-body text-ink-muted">
                Filter by category, brand, nutrition grade and processing level.
              </p>
            </div>
            <NuxtLink
              to="/products"
              class="rounded-control bg-accent px-4 py-2 text-label text-ink-on-accent transition-colors hover:bg-accent-hover"
            >
              Open the directory
            </NuxtLink>
          </div>
        </UiSurfaceCard>
      </template>
    </div>
  </UiPageContainer>
</template>
