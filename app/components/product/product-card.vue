<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'

const props = defineProps<{ product: ProductSummary }>()

const name = computed(() => productDisplayName(props.product))
const category = computed(() => mostSpecificTag(props.product.categories))
const brand = computed(() => props.product.brands[0] ?? null)

const queryCache = useQueryCache()

function prefetch() {
  const entry = queryCache.ensure(productDetailQuery(props.product.code))
  queryCache.refresh(entry).catch(() => {})
}
</script>

<template>
  <UiSurfaceCard
    as="li"
    padding="none"
    interactive
    class="group relative flex flex-col overflow-hidden"
    @mouseenter="prefetch"
    @focusin="prefetch"
  >
    <div
      class="relative aspect-[4/3] shrink-0 bg-surface-media"
      :style="{ viewTransitionName: `product-image-${product.code}` }"
    >
      <img
        v-if="product.image"
        :src="product.image.small ?? product.image.large ?? product.image.thumb ?? undefined"
        :srcset="
          srcSet([
            { url: product.image.small, width: 200 },
            { url: product.image.large, width: 400 },
          ])
        "
        sizes="(min-width: 1024px) 220px, 45vw"
        alt=""
        loading="lazy"
        decoding="async"
        class="absolute inset-0 size-full object-contain p-4"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center">
        <UiImageFallback size="lg" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col justify-start gap-1 border-t border-edge-subtle p-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="min-w-0 text-subheading text-ink">
          <NuxtLink
            :to="`/products/${product.code}`"
            class="line-clamp-2 after:absolute after:inset-0 group-hover:text-ink-accent"
          >
            {{ name }}
          </NuxtLink>
        </h3>
        <ProductNutriScoreBadge :grade="product.nutriScore" size="sm" />
      </div>

      <p class="truncate text-caption text-ink-muted">
        <span v-if="brand">{{ brand }}</span>
        <span v-if="brand && category" aria-hidden="true"> · </span>
        <span v-if="category" class="text-ink-subtle">{{ category.label }}</span>
      </p>
    </div>
  </UiSurfaceCard>
</template>
