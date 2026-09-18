<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'

/**
 * A product as a card, for the landing page only.
 *
 * The directory uses rows, because a directory exists to compare measurements
 * down a column. Nothing is being compared here: these are a handful of
 * products offered as a way in, so the photograph leads and no figures are
 * shown at all. Half a figure is worse than none.
 */
const props = defineProps<{ product: ProductSummary }>()

const name = computed(() => productDisplayName(props.product))
const category = computed(() => mostSpecificTag(props.product.categories))
const brand = computed(() => props.product.brands[0] ?? null)

/**
 * The detail page is a different query from the search that produced this card,
 * so following the link starts from nothing and the photograph the view
 * transition just carried over is replaced by a skeleton on arrival. Warming
 * the entry on hover means the page usually has its data before the morph ends
 * and the image stays put.
 *
 * `refresh`, not `fetch`: a fresh entry is left alone, so moving the pointer
 * back and forth across a card does not re-request anything.
 */
const queryCache = useQueryCache()

function prefetch() {
  const entry = queryCache.ensure(productDetailQuery(props.product.code))
  queryCache.refresh(entry).catch(() => {
    // A failed prefetch is not the reader's problem: the page will ask again
    // and show its own error state if it fails there too.
  })
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
    <!--
      Drawn around 200px wide, so the 200px variant covers a standard display
      and the 400px one covers a retina display. White tile in both themes, for
      the same reason as the directory: packaging is shot on a white sweep.
    -->
    <!--
      The image is positioned out of flow so it cannot push the box taller than
      its ratio. Left in flow, a portrait bottle sets the row height for every
      card beside it: `aspect-ratio` states a preferred size, and a flex item's
      `min-height: auto` beats it.
    -->
    <!--
      Named per product, so this tile can be paired with the same product's page
      and carried across rather than cross-faded with the rest of the screen.
      The name has to be unique within one captured document, which a barcode
      already is; a fixed `product-image` would collide eight times over and the
      browser would abandon the transition.
      Static rather than set on the clicked card at click time, which is the
      other way to do this. The cost is that the seven cards with no counterpart
      on the next page leave as their own layers instead of going with the page
      snapshot — measured, and indistinguishable, because they are all fading
      out over the same duration as the page behind them. The saving is that
      there is no click handler to keep in step, and the transition works in
      reverse for free when the reader comes back.
    -->
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
