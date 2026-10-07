<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { NUTRIENT_KEYS } from '#shared/domain/nutrition'
import { productDisplayName } from '#shared/domain/product'

definePageMeta({
  viewTransition: true,
})

const { t } = useI18n()
const format = useFormat()
const localePath = useLocalePath()
const language = useLanguage()

// Not by name: each language has a route of its own here, whose name ends in the language.
const route = useRoute()
const code = computed(() => String(route.params.code))

const { state, asyncStatus, refresh } = useQuery(() =>
  productDetailQuery({ code: code.value, language: language.value }),
)

const product = computed(() => state.value.data)
const error = computed(() => state.value.error)
const isLoading = computed(() => asyncStatus.value === 'loading' && !product.value)

useErrorStatus(error, refresh)

const title = computed(() =>
  product.value
    ? productDisplayName(product.value, t('product.unnamed', { code: product.value.code }))
    : t('product.fallbackTitle'),
)

useHead(() => ({ title: title.value }))

const modifiedLabel = computed(() =>
  product.value?.lastModified ? format.date(product.value.lastModified) : null,
)

const isNotFound = computed(
  () => (error.value as { statusCode?: number } | null)?.statusCode === 404,
)
</script>

<template>
  <UiPageContainer>
    <div class="flex flex-col gap-6">
      <UiBreadcrumbs
        :items="[{ text: t('products.title'), to: localePath('/products') }, { text: title }]"
      />

      <UiEmptyState
        v-if="isNotFound"
        :heading-level="1"
        :title="t('product.notFound')"
        :description="t('product.notFoundHint', { code })"
      >
        <UiButton :to="localePath('/products')">{{ t('product.browse') }}</UiButton>
      </UiEmptyState>

      <UiErrorState
        v-else-if="error"
        :heading-level="1"
        :title="t('product.loadFailed')"
        :description="t('errors.sourceUnavailable')"
        :retrying="isLoading"
        @retry="refresh()"
      />

      <template v-else>
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            class="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-card border border-edge-subtle bg-surface-media"
            :style="{ viewTransitionName: `product-image-${code}` }"
          >
            <UiSkeleton v-if="!product" class="size-full" />
            <img
              v-else-if="product.image"
              :src="product.image.small ?? product.image.large ?? product.image.thumb ?? undefined"
              :srcset="
                srcSet([
                  { url: product.image.small, width: 200 },
                  { url: product.image.large, width: 400 },
                ])
              "
              sizes="112px"
              :alt="t('product.imageAlt', { name: title })"
              width="112"
              height="112"
              decoding="async"
              class="size-full object-contain"
            />
            <UiImageFallback v-else size="lg" :label="t('product.noImage', { name: title })" />
          </div>

          <div v-if="product" class="flex min-w-0 flex-1 flex-col gap-1">
            <h1 class="reveal text-title text-ink">{{ title }}</h1>

            <p v-if="product.brands.length" class="text-body text-ink-muted">
              {{ product.brands.join(', ') }}
            </p>

            <p v-if="product.quantity" class="text-label text-ink-subtle">
              {{ product.quantity }}
            </p>

            <ul v-if="product.categories.length" class="mt-1 flex flex-wrap gap-1.5">
              <li v-for="category in product.categories.slice(-4)" :key="category.id">
                <UiChip
                  tone="neutral"
                  :to="localePath({ path: '/products', query: { category: category.id } })"
                >
                  {{ category.label }}
                </UiChip>
              </li>
            </ul>
          </div>

          <!--
            A usual header, line for line in the same type, so what sits below it is already where
            the record will leave it. Opening with the list's copy of the product instead would
            show one version and then another: the search index and the record disagree on most
            products (docs/upstream-api.md).
          -->
          <div v-else class="flex min-w-0 flex-1 flex-col gap-1" aria-hidden="true">
            <UiSkeleton class="h-[1lh] w-2/3 text-title" />
            <UiSkeleton class="h-[1lh] w-1/3 text-body" />
            <UiSkeleton class="h-[1lh] w-16 text-label" />
            <!-- Shaped like the chips, list items and all: a chip sits on a line taller than it. -->
            <ul class="mt-1 flex flex-wrap gap-1.5">
              <li v-for="index in 4" :key="index">
                <span
                  class="inline-flex animate-pulse rounded-pill border border-transparent bg-surface-sunken px-2.5 py-1 text-caption"
                >
                  <span class="w-20">&nbsp;</span>
                </span>
              </li>
            </ul>
          </div>

          <div class="flex shrink-0 gap-4">
            <div class="flex flex-col items-center gap-1">
              <ProductNutriScoreBadge v-if="product" :grade="product.nutriScore" size="lg" />
              <UiSkeleton v-else class="size-10" />
              <span class="text-caption text-ink-subtle">Nutri-Score</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <ProductNovaBadge v-if="product" :group="product.novaGroup" size="lg" />
              <UiSkeleton v-else class="size-10" />
              <span class="text-caption text-ink-subtle">NOVA</span>
            </div>
          </div>
        </header>

        <div data-scroll-section class="grid scroll-mt-6 gap-4 lg:grid-cols-3">
          <UiSurfaceCard class="lg:col-span-2">
            <h2 class="mb-3 text-heading text-ink">{{ t('product.nutrition') }}</h2>

            <ProductNutrientTable v-if="product" :nutrients="product.nutrients" />

            <!-- A bar for each row the table will have, at a row's height. -->
            <div v-else class="text-label">
              <div
                v-for="index in NUTRIENT_KEYS.length + 1"
                :key="index"
                class="border-b border-edge-subtle py-2 last:border-0"
              >
                <UiSkeleton class="h-[1lh]" />
              </div>
            </div>
          </UiSurfaceCard>

          <div class="flex flex-col gap-4">
            <UiSurfaceCard class="flex-1">
              <h2 class="mb-3 text-heading text-ink">{{ t('product.composition') }}</h2>

              <dl class="flex flex-col gap-3 text-label">
                <div>
                  <dt class="text-overline text-ink-subtle uppercase">
                    {{ t('product.ingredients') }}
                  </dt>
                  <dd class="text-ink">
                    <UiSkeleton v-if="!product" class="h-[1lh] w-8" />
                    <span v-else-if="product.ingredientCount !== null" data-numeric>
                      {{ product.ingredientCount }}
                    </span>
                    <span v-else class="text-ink-subtle">{{ t('product.notReported') }}</span>
                  </dd>
                </div>

                <div>
                  <dt class="text-overline text-ink-subtle uppercase">
                    {{ t('product.additives') }}
                  </dt>
                  <dd>
                    <UiSkeleton v-if="!product" class="h-[1lh] w-24" />
                    <ul v-else-if="product.additives.length" class="mt-1 flex flex-wrap gap-1">
                      <li v-for="additive in product.additives" :key="additive.id">
                        <UiChip tone="muted">{{ additive.label }}</UiChip>
                      </li>
                    </ul>
                    <span v-else class="text-ink-subtle">{{ t('product.noneListed') }}</span>
                  </dd>
                </div>

                <div v-if="product?.labels.length">
                  <dt class="text-overline text-ink-subtle uppercase">{{ t('product.labels') }}</dt>
                  <dd>
                    <ul class="mt-1 flex flex-wrap gap-1">
                      <li v-for="label in product.labels" :key="label.id">
                        <UiChip tone="accent">{{ label.label }}</UiChip>
                      </li>
                    </ul>
                  </dd>
                </div>
              </dl>
            </UiSurfaceCard>

            <UiSurfaceCard v-if="product" class="flex-1">
              <h2 class="mb-2 text-heading text-ink">{{ t('product.source') }}</h2>
              <p class="text-caption text-ink-muted">
                {{ t('product.contributed') }}
                <template v-if="modifiedLabel">
                  {{ t('product.lastEdited', { date: modifiedLabel }) }}</template
                >
              </p>
              <a
                :href="product.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-block text-caption text-ink-accent underline underline-offset-2"
              >
                {{ t('product.viewOriginal') }}
              </a>
            </UiSurfaceCard>
          </div>
        </div>

        <UiSurfaceCard v-if="product?.ingredientsText" data-scroll-section class="scroll-mt-6">
          <h2 class="mb-2 text-heading text-ink">{{ t('product.ingredientsList') }}</h2>
          <p class="text-body text-ink-muted">{{ product.ingredientsText }}</p>
        </UiSurfaceCard>
      </template>
    </div>
  </UiPageContainer>
</template>
