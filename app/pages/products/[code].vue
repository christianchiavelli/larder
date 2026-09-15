<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { productDisplayName } from '#shared/domain/product'
import { NOVA_LABELS } from '#shared/domain/nutrition'

const route = useRoute('products-code')
const code = computed(() => String(route.params.code))

const { state, asyncStatus, refresh } = useQuery(() => productDetailQuery(code.value))

const product = computed(() => state.value.data)
const error = computed(() => state.value.error)
const isLoading = computed(() => asyncStatus.value === 'loading' && !product.value)

const title = computed(() => (product.value ? productDisplayName(product.value) : 'Product'))

useHead(() => ({ title: title.value }))

const modifiedLabel = computed(() => {
  if (!product.value?.lastModified) return null
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(product.value.lastModified),
  )
})

/**
 * Upstream sends "not found" as a 404, and Pinia Colada surfaces it as an
 * error like any other. Distinguishing them matters: a missing product is a
 * normal outcome a user can act on, while an outage is not, and offering
 * "try again" for a barcode that does not exist is advice that cannot work.
 */
const isNotFound = computed(
  () => (error.value as { statusCode?: number } | null)?.statusCode === 404,
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <nav aria-label="Breadcrumb" class="text-label">
      <NuxtLink to="/products" class="text-ink-muted hover:text-ink">&larr; All products</NuxtLink>
    </nav>

    <UiEmptyState
      v-if="isNotFound"
      title="No product under that barcode"
      :description="`Nothing in the catalogue is registered as ${code}. It may not have been contributed yet.`"
    >
      <NuxtLink
        to="/products"
        class="mt-2 rounded-control border border-edge-strong px-3 py-1.5 text-label text-ink hover:bg-surface-hover"
      >
        Browse products
      </NuxtLink>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="error"
      tone="error"
      title="Could not load this product"
      :description="error.message"
      @retry="refresh()"
    />

    <template v-else>
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          class="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-card border border-edge-subtle bg-surface-sunken"
        >
          <UiSkeleton v-if="isLoading" class="size-full" />
          <img
            v-else-if="product?.imageUrl"
            :src="product.imageUrl"
            :alt="`Packaging of ${title}`"
            class="size-full object-contain"
          />
          <span v-else class="text-caption text-ink-subtle">No image</span>
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <UiSkeleton v-if="isLoading" class="h-8 w-2/3" />
          <h1 v-else class="text-title text-ink">{{ title }}</h1>

          <p v-if="product?.brands.length" class="text-body text-ink-muted">
            {{ product.brands.join(', ') }}
          </p>

          <p v-if="product?.quantity" class="text-label text-ink-subtle">{{ product.quantity }}</p>

          <ul v-if="product?.categories.length" class="mt-1 flex flex-wrap gap-1.5">
            <li v-for="category in product.categories.slice(-4)" :key="category.id">
              <UiChip tone="neutral" :to="`/products?category=${encodeURIComponent(category.id)}`">
                {{ category.label }}
              </UiChip>
            </li>
          </ul>
        </div>

        <div v-if="!isLoading && product" class="flex shrink-0 gap-4">
          <div class="flex flex-col items-center gap-1">
            <ProductNutriScoreBadge :grade="product.nutriScore" size="lg" />
            <span class="text-caption text-ink-subtle">Nutri-Score</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span
              class="inline-flex size-10 items-center justify-center rounded-control text-heading font-semibold text-white"
              :class="{
                'bg-nova-1': product.novaGroup === 1,
                'bg-nova-2': product.novaGroup === 2,
                'bg-nova-3': product.novaGroup === 3,
                'bg-nova-4': product.novaGroup === 4,
                'bg-nova-unknown text-ink-muted': product.novaGroup === null,
              }"
              role="img"
              :aria-label="
                product.novaGroup === null
                  ? 'NOVA processing group not available'
                  : `NOVA group ${product.novaGroup}, ${NOVA_LABELS[product.novaGroup]}`
              "
            >
              <span aria-hidden="true">{{ product.novaGroup ?? '?' }}</span>
            </span>
            <span class="text-caption text-ink-subtle">NOVA</span>
          </div>
        </div>
      </header>

      <div class="grid gap-4 lg:grid-cols-3">
        <UiSurfaceCard class="lg:col-span-2">
          <h2 class="mb-3 text-heading text-ink">Nutrition</h2>

          <div v-if="isLoading" class="flex flex-col gap-2">
            <UiSkeleton v-for="index in 6" :key="index" class="h-6 w-full" />
          </div>

          <ProductNutrientTable v-else-if="product" :nutrients="product.nutrients" />
        </UiSurfaceCard>

        <div class="flex flex-col gap-4">
          <UiSurfaceCard>
            <h2 class="mb-3 text-heading text-ink">Composition</h2>

            <dl class="flex flex-col gap-3 text-label">
              <div>
                <dt class="text-overline text-ink-subtle uppercase">Ingredients</dt>
                <dd class="text-ink">
                  <span
                    v-if="
                      product?.ingredientCount !== null && product?.ingredientCount !== undefined
                    "
                    data-numeric
                  >
                    {{ product.ingredientCount }}
                  </span>
                  <span v-else class="text-ink-subtle">Not reported</span>
                </dd>
              </div>

              <div>
                <dt class="text-overline text-ink-subtle uppercase">Additives</dt>
                <dd>
                  <ul v-if="product?.additives.length" class="flex flex-wrap gap-1">
                    <li v-for="additive in product.additives" :key="additive.id">
                      <UiChip tone="muted">{{ additive.label }}</UiChip>
                    </li>
                  </ul>
                  <span v-else class="text-ink-subtle">None listed</span>
                </dd>
              </div>

              <div v-if="product?.labels.length">
                <dt class="text-overline text-ink-subtle uppercase">Labels</dt>
                <dd>
                  <ul class="flex flex-wrap gap-1">
                    <li v-for="label in product.labels" :key="label.id">
                      <UiChip tone="accent">{{ label.label }}</UiChip>
                    </li>
                  </ul>
                </dd>
              </div>
            </dl>
          </UiSurfaceCard>

          <UiSurfaceCard v-if="product">
            <h2 class="mb-2 text-heading text-ink">Source</h2>
            <p class="text-caption text-ink-muted">
              Contributed to Open Food Facts by the public.
              <template v-if="modifiedLabel"> Last edited {{ modifiedLabel }}.</template>
            </p>
            <a
              :href="product.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-caption text-ink-accent underline underline-offset-2"
            >
              View the original record
            </a>
          </UiSurfaceCard>
        </div>
      </div>

      <UiSurfaceCard v-if="product?.ingredientsText">
        <h2 class="mb-2 text-heading text-ink">Ingredients list</h2>
        <p class="text-body text-ink-muted">{{ product.ingredientsText }}</p>
      </UiSurfaceCard>
    </template>
  </div>
</template>
