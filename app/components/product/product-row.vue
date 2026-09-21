<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'
import { NUTRIENTS } from '#shared/domain/nutrition'

const props = defineProps<{ product: ProductSummary }>()

const name = computed(() => productDisplayName(props.product))
const category = computed(() => mostSpecificTag(props.product.categories))
const brand = computed(() => props.product.brands[0] ?? null)

const queryCache = useQueryCache()

function prefetch() {
  queryCache.refresh(queryCache.ensure(productDetailQuery(props.product.code))).catch(() => {})
}

const COLUMNS = ['energyKcal', 'sugars', 'salt'] as const

const nutrients = computed(() =>
  COLUMNS.map((key) => ({
    key,
    label: NUTRIENTS[key].label,
    unit: NUTRIENTS[key].unit,
    precision: NUTRIENTS[key].precision,
    value: props.product.nutrients[key],
  })),
)
</script>

<template>
  <div
    data-testid="product-row"
    class="group relative flex items-center gap-4 rounded-card border border-edge-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-edge hover:bg-surface-hover"
    @mouseenter="prefetch"
    @focusin="prefetch"
  >
    <div
      class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-edge-subtle bg-surface-media"
      :style="{ viewTransitionName: `product-image-${product.code}` }"
    >
      <img
        v-if="product.image"
        :src="product.image.thumb ?? product.image.small ?? product.image.large ?? undefined"
        :srcset="
          srcSet([
            { url: product.image.thumb, width: 100 },
            { url: product.image.small, width: 200 },
          ])
        "
        sizes="48px"
        alt=""
        width="48"
        height="48"
        loading="lazy"
        decoding="async"
        class="size-full object-contain"
      />
      <UiImageFallback v-else />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <h3 class="truncate text-subheading text-ink">
        <NuxtLink
          :to="`/products/${product.code}`"
          class="after:absolute after:inset-0 group-hover:text-ink-accent"
        >
          {{ name }}
        </NuxtLink>
      </h3>
      <p class="truncate text-caption text-ink-muted">
        <span v-if="brand">{{ brand }}</span>
        <span v-if="brand && category" aria-hidden="true"> · </span>
        <span v-if="category" class="text-ink-subtle">{{ category.label }}</span>
      </p>
    </div>

    <dl class="hidden shrink-0 items-center gap-7 pr-2 lg:flex">
      <div v-for="item in nutrients" :key="item.key" class="w-[4.5rem] text-right">
        <dt class="text-overline text-ink-subtle">{{ item.label }}</dt>
        <dd class="text-label text-ink">
          <template v-if="item.value !== null">
            <span data-numeric>{{ item.value.toFixed(item.precision) }}</span>
            <span class="text-ink-subtle">{{ item.unit }}</span>
          </template>
          <span v-else class="text-ink-subtle" :title="`${item.label} not reported`">&mdash;</span>
        </dd>
      </div>
    </dl>

    <div class="flex shrink-0 items-center gap-2 border-l border-edge-subtle pl-4 lg:pl-5">
      <ProductNutriScoreBadge :grade="product.nutriScore" />
      <ProductNovaBadge :group="product.novaGroup" />
    </div>

    <span
      aria-hidden="true"
      class="hidden size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle transition-colors group-hover:bg-accent group-hover:text-ink-on-accent sm:flex"
    >
      <UiIcon name="chevron-right" class="size-3.5" />
    </span>
  </div>
</template>
