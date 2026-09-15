<script setup lang="ts">
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'
import { NUTRIENTS } from '#shared/domain/nutrition'

/**
 * One product as a row.
 *
 * A row rather than a card, because the point of a directory of measurements is
 * comparing them. In a grid, energy for one product sits above sugar for
 * another and the eye has nothing to run down; in a row the same figure lands
 * in the same column every time, and the whole page becomes scannable.
 *
 * The nutrient columns are fixed and in a fixed order, never "whichever three
 * this product declares", for the same reason.
 */
const props = defineProps<{ product: ProductSummary }>()

const name = computed(() => productDisplayName(props.product))
const category = computed(() => mostSpecificTag(props.product.categories))
const brand = computed(() => props.product.brands[0] ?? null)

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
    class="group relative flex items-center gap-4 rounded-card border border-edge-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-edge hover:bg-surface-hover motion-reduce:transition-none"
  >
    <!--
      The image slot is always reserved, at a fixed size. A good share of the
      catalogue has no photograph, and letting the box collapse would make every
      row a different height.
    -->
    <div
      class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-edge-subtle bg-surface"
    >
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        alt=""
        loading="lazy"
        decoding="async"
        class="size-full object-contain"
      />
      <svg
        v-else
        class="size-5 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5z" stroke-linejoin="round" />
      </svg>
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

    <!-- Hidden below the breakpoint where the columns would stop lining up.
         A misaligned column is worse than an absent one. -->
    <dl class="hidden shrink-0 items-center gap-7 pr-2 lg:flex">
      <div v-for="item in nutrients" :key="item.key" class="w-[4.5rem] text-right">
        <dt class="text-overline text-ink-subtle">{{ item.label }}</dt>
        <dd class="text-label text-ink">
          <template v-if="item.value !== null">
            <span data-numeric>{{ item.value.toFixed(item.precision) }}</span>
            <span class="text-ink-subtle">{{ item.unit === 'kcal' ? '' : item.unit }}</span>
          </template>
          <span v-else class="text-ink-subtle" :title="`${item.label} not reported`">&mdash;</span>
        </dd>
      </div>
    </dl>

    <div class="flex shrink-0 items-center gap-2 border-l border-edge-subtle pl-4 lg:pl-5">
      <ProductNutriScoreBadge :grade="product.nutriScore" />
      <ProductNovaBadge :group="product.novaGroup" />
    </div>

    <!-- Affordance only; the stretched link on the heading is what is actually
         clickable, so this must not be announced as a second control. -->
    <span
      aria-hidden="true"
      class="hidden size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle transition-colors group-hover:bg-accent group-hover:text-ink-on-accent sm:flex motion-reduce:transition-none"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  </div>
</template>
