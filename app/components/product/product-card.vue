<script setup lang="ts">
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'
import { NUTRIENTS } from '#shared/domain/nutrition'

const props = defineProps<{ product: ProductSummary }>()

const name = computed(() => productDisplayName(props.product))
const category = computed(() => mostSpecificTag(props.product.categories))
const brand = computed(() => props.product.brands[0] ?? null)

/**
 * The three figures worth showing at a glance, in a fixed order.
 *
 * Fixed rather than "whichever three this product declares", so the same
 * position means the same nutrient on every card. A grid where the second
 * number is sugar on one card and salt on the next cannot be scanned down a
 * column, which is the only reason to lay cards out in a grid.
 */
const HIGHLIGHTS = ['energyKcal', 'sugars', 'salt'] as const

const highlights = computed(() =>
  HIGHLIGHTS.map((key) => ({
    key,
    label: NUTRIENTS[key].label,
    unit: NUTRIENTS[key].unit,
    precision: NUTRIENTS[key].precision,
    value: props.product.nutrients[key],
  })),
)
</script>

<template>
  <!-- `relative` is what the link's stretched ::after anchors to, making the
       whole card clickable while the accessible name stays on the heading. -->
  <UiSurfaceCard
    as="article"
    padding="none"
    interactive
    class="relative flex h-full flex-col overflow-hidden"
  >
    <div class="flex items-start gap-3 p-4">
      <!--
        Upstream images come from a host we do not control and a good share of
        the catalogue has none, so the slot is always reserved: without a fixed
        box the grid rows would each be a different height depending on which
        products happen to have a photo.
      -->
      <div
        class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken"
      >
        <img
          v-if="product.imageUrl"
          :src="product.imageUrl"
          alt=""
          loading="lazy"
          decoding="async"
          class="size-full object-contain"
        />
        <span v-else class="text-caption text-ink-subtle" aria-hidden="true">No image</span>
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="text-subheading text-ink">
          <NuxtLink
            :to="`/products/${product.code}`"
            class="after:absolute after:inset-0 hover:text-ink-accent"
          >
            {{ name }}
          </NuxtLink>
        </h3>

        <p v-if="brand" class="truncate text-label text-ink-muted">{{ brand }}</p>
        <p v-if="category" class="truncate text-caption text-ink-subtle">{{ category.label }}</p>
      </div>

      <div class="flex shrink-0 flex-col items-end gap-1.5">
        <UiNutriScoreBadge :grade="product.nutriScore" />
        <UiNovaBadge :group="product.novaGroup" />
      </div>
    </div>

    <dl class="mt-auto grid grid-cols-3 divide-x divide-edge-subtle border-t border-edge-subtle">
      <div v-for="item in highlights" :key="item.key" class="px-3 py-2">
        <dt class="text-overline text-ink-subtle uppercase">{{ item.label }}</dt>
        <dd class="text-label text-ink">
          <template v-if="item.value !== null">
            <span data-numeric>{{ item.value.toFixed(item.precision) }}</span>
            <span class="text-ink-subtle"> {{ item.unit }}</span>
          </template>
          <!-- Not reported and zero are different facts about a product. -->
          <span v-else class="text-ink-subtle" :title="`${item.label} not reported`">&mdash;</span>
        </dd>
      </div>
    </dl>
  </UiSurfaceCard>
</template>
