<script setup lang="ts">
import {
  EMPTY_PRODUCT_QUERY,
  catalogueSize as catalogueSizeOf,
  classifiedShare,
  gradedShare,
  type NutriScoreDistribution,
} from '#shared/domain/search'

const { t } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ title: t('overview.title') }))

definePageMeta({
  viewTransition: true,
})

const query = computed(() => EMPTY_PRODUCT_QUERY)
const { state, asyncStatus, refresh } = useProductSearch(query)

const result = computed(() => state.value.data)
const error = computed(() => state.value.error)
const isLoading = computed(() => asyncStatus.value === 'loading' && !result.value)

useErrorStatus(error, refresh)

const distribution = computed<NutriScoreDistribution>(
  () => result.value?.nutriScoreDistribution ?? {},
)

const catalogueSize = computed(() => catalogueSizeOf(distribution.value))
const scored = computed(() => gradedShare(distribution.value))

const classified = computed(() =>
  result.value ? classifiedShare(distribution.value, result.value.novaClassifiedCount) : null,
)
</script>

<template>
  <UiPageContainer>
    <div class="flex flex-col gap-6">
      <UiPageHeader :title="t('overview.heading')" :description="t('overview.description')" />

      <UiErrorState
        v-if="error"
        :title="t('overview.loadFailed')"
        :description="t('errors.sourceUnavailable')"
        :retrying="isLoading"
        @retry="refresh()"
      />

      <template v-else>
        <UiSurfaceCard data-scroll-section class="scroll-mt-6">
          <div class="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-edge-subtle">
            <UiStatTile
              class="sm:pr-6"
              :label="t('overview.size')"
              :value="catalogueSize"
              size="lg"
              :loading="isLoading"
              :caption="t('overview.sizeCaption')"
            />
            <UiStatTile
              class="sm:px-6"
              :label="t('overview.graded')"
              :value="scored"
              unit="%"
              :precision="1"
              size="lg"
              :loading="isLoading"
              :caption="t('overview.gradedCaption')"
            />
            <UiStatTile
              class="sm:pl-6"
              :label="t('overview.classified')"
              :value="classified"
              unit="%"
              :precision="1"
              size="lg"
              :loading="isLoading"
              :caption="t('overview.classifiedCaption')"
            />
          </div>
        </UiSurfaceCard>

        <div data-scroll-section class="grid scroll-mt-6 gap-4 lg:grid-cols-2">
          <UiSurfaceCard>
            <h2 class="mb-1 text-heading text-ink">{{ t('overview.nutriScoreTitle') }}</h2>
            <p class="mb-3 text-caption text-ink-subtle">
              {{ t('overview.nutriScoreCaption') }}
            </p>
            <ProductNutriScoreChart :distribution="distribution" :loading="isLoading" />
          </UiSurfaceCard>

          <UiSurfaceCard>
            <h2 class="mb-1 text-heading text-ink">{{ t('overview.categoriesTitle') }}</h2>
            <p class="mb-3 text-caption text-ink-subtle">
              {{ t('overview.categoriesCaption') }}
            </p>
            <ProductFacetChart
              :title="t('charts.categories')"
              :items="result?.facets.categories_tags ?? []"
              :loading="isLoading"
            />
          </UiSurfaceCard>

          <UiSurfaceCard class="lg:col-span-2">
            <h2 class="mb-1 text-heading text-ink">{{ t('overview.brandsTitle') }}</h2>
            <p class="mb-3 text-caption text-ink-subtle">
              {{ t('overview.brandsCaption') }}
            </p>
            <ProductFacetChart
              :title="t('charts.brands')"
              :items="result?.facets.brands_tags ?? []"
              :limit="12"
              :loading="isLoading"
            />
          </UiSurfaceCard>
        </div>

        <UiSurfaceCard data-scroll-section class="scroll-mt-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-heading text-ink">{{ t('overview.browseTitle') }}</h2>
              <p class="text-body text-ink-muted">
                {{ t('overview.browseText') }}
              </p>
            </div>
            <UiButton :to="localePath('/products')">{{ t('overview.browseAction') }}</UiButton>
          </div>
        </UiSurfaceCard>
      </template>
    </div>
  </UiPageContainer>
</template>
