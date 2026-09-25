<script setup lang="ts">
import { hasActiveFilters } from '#shared/domain/search'

useHead({ title: 'Products' })

definePageMeta({
  viewTransition: true,
})

const { query, setPage, clearFilters } = useProductQuery()
const { state, asyncStatus, refresh } = useProductSearch(query)

const result = computed(() => state.value.data)
const isLoading = computed(() => asyncStatus.value === 'loading')
const error = computed(() => state.value.error)
const showingFilters = computed(() => hasActiveFilters(query.value))
const exportable = computed(() => !error.value && (result.value?.totalCount ?? 0) > 0)

useErrorStatus(error, refresh)

const totalLabel = computed(() => {
  if (!result.value) return null
  const formatted = formatCount(result.value.totalCount)
  return result.value.isTotalExact ? formatted : `${formatted}+`
})
</script>

<template>
  <UiPageContainer>
    <div>
      <UiPageHeader
        title="Products"
        description="Search a public catalogue of packaged food by category, brand, nutrition grade and processing level."
      />

      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <ProductFilterPanel
          :facets="result?.facets ?? null"
          :loading="isLoading && !result && !error"
        />

        <div
          class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-edge-subtle bg-surface-raised shadow-card"
        >
          <ProductSearchControls />

          <div
            v-if="!error"
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-edge-subtle bg-surface px-3 py-2"
          >
            <p class="text-caption text-ink-muted" aria-live="polite" data-testid="result-summary">
              <template v-if="totalLabel">
                <span data-numeric>{{ totalLabel }}</span>
                {{ result!.totalCount === 1 ? 'product' : 'products' }}
                <span v-if="!result!.isTotalExact" class="text-ink-subtle">
                  (upstream stops counting at 10,000)
                </span>
              </template>
              <UiSkeleton v-else class="h-4 w-32" />
            </p>

            <ProductExport v-if="exportable" :facets="result?.facets ?? null" />
          </div>

          <div class="flex flex-1 flex-col gap-2 bg-surface p-2">
            <UiErrorState
              v-if="error"
              title="We couldn't load the products"
              :description="SOURCE_UNAVAILABLE"
              :retrying="isLoading"
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
                class="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label text-ink-on-accent transition-colors hover:bg-accent-hover"
                @click="clearFilters()"
              >
                Clear all filters
              </button>
            </UiEmptyState>

            <template v-else>
              <ul
                class="flex flex-col gap-1.5 transition-opacity"
                :class="isLoading && 'opacity-60'"
              >
                <li v-for="product in result?.items ?? []" :key="product.code" class="reveal">
                  <ProductRow :product="product" />
                </li>

                <li v-for="index in result ? 0 : 8" :key="`skeleton-${index}`">
                  <UiSkeleton rounded="card" class="h-[4.5rem] w-full" />
                </li>
              </ul>
            </template>
          </div>

          <div
            v-if="result && result.items.length > 0"
            class="flex flex-col items-center gap-3 border-t border-edge-subtle bg-surface-raised p-3 sm:flex-row sm:justify-between"
          >
            <ProductPageSizeField />

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
  </UiPageContainer>
</template>
