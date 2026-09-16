<script setup lang="ts">
import { productDisplayName, type ProductSummary } from '#shared/domain/product'
import { mostSpecificTag } from '#shared/domain/taxonomy'
import { NUTRIENTS } from '#shared/domain/nutrition'

/**
 * A row, not a card: in a grid one product's energy sits above another's sugar
 * and the eye has nothing to run down. Fixed columns in a fixed order, same
 * reason.
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
      class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-edge-subtle bg-surface-media"
    >
      <!--
        Drawn at 48px, so the 100px variant covers a standard display and the
        200px one covers a retina display. Handing the browser the 400px
        original, which is what a single `src` used to do, downloads roughly
        sixteen times the pixels that get painted, two dozen times per page.

        Fitted, never cropped, and the tile behind it is white in both themes.

        Packaging is photographed on a white sweep and carries it in the file,
        so a portrait bottle in a square tile puts two white bars against
        whatever is behind them; matching the tile to the paper is what removes
        the seam. Cropping to fill was tried and is worse: these photographs are
        submitted by the public at every aspect ratio, and a square crop of a
        tall bottle is a strip of one colour. Bars on the minority of shots not
        taken on white are the cost of never cropping the product out of frame.
      -->
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

    <!-- Hidden below the breakpoint where the columns would stop lining up.
         A misaligned column is worse than an absent one. -->
    <dl class="hidden shrink-0 items-center gap-7 pr-2 lg:flex">
      <div v-for="item in nutrients" :key="item.key" class="w-[4.5rem] text-right">
        <dt class="text-overline text-ink-subtle">{{ item.label }}</dt>
        <dd class="text-label text-ink">
          <template v-if="item.value !== null">
            <span data-numeric>{{ item.value.toFixed(item.precision) }}</span>
            <!--
              The unit is rendered for energy too. Under a label reading
              "Energy", a bare number is read as kilojoules by anyone used to a
              European label, where kJ is the figure that comes first. That is
              wrong by a factor of four and looks like a plausible value.
            -->
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

    <!-- Affordance only; the stretched link on the heading is what is actually
         clickable, so this must not be announced as a second control. -->
    <span
      aria-hidden="true"
      class="hidden size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle transition-colors group-hover:bg-accent group-hover:text-ink-on-accent sm:flex motion-reduce:transition-none"
    >
      <UiIcon name="chevron-right" class="size-3.5" />
    </span>
  </div>
</template>
