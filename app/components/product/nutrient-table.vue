<script setup lang="ts">
import {
  NUTRIENTS,
  NUTRIENT_KEYS,
  referenceIntakeShare,
  type NutrientProfile,
} from '#shared/domain/nutrition'

/**
 * Declared nutrition per 100g, against the EU reference intake.
 *
 * Per 100g rather than per serving. Serving sizes are free text upstream, often
 * missing, and set by the manufacturer, so a per-serving table would compare
 * products on a basis each of them chose for itself.
 *
 * Reference intake percentages are shown only where Regulation 1169/2011 sets
 * one. Fibre and sodium have none, and inventing a denominator so the column
 * looks complete would be presenting our arithmetic as a regulated figure.
 */
const props = defineProps<{ nutrients: NutrientProfile }>()

const rows = computed(() =>
  NUTRIENT_KEYS.map((key) => {
    const descriptor = NUTRIENTS[key]
    const value = props.nutrients[key]
    const share = referenceIntakeShare(key, value)

    return {
      key,
      label: descriptor.label,
      unit: descriptor.unit,
      value,
      formatted: value === null ? null : value.toFixed(descriptor.precision),
      share,
      // Bars are capped for layout, but the number beside them is not, so a
      // product carrying twice a daily reference still says so.
      barWidth: share === null ? 0 : Math.min(100, share * 100),
      sharePercent: share === null ? null : Math.round(share * 100),
    }
  }),
)

const declaredCount = computed(() => rows.value.filter((row) => row.value !== null).length)
</script>

<template>
  <div class="flex flex-col gap-3">
    <table class="w-full border-collapse text-label">
      <caption class="sr-only">
        Nutrition per 100 grams, with the share of an adult daily reference intake
      </caption>
      <thead>
        <tr class="border-b border-edge">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted">Nutrient</th>
          <th scope="col" class="py-2 pr-6 text-right font-medium text-ink-muted">Per 100g</th>
          <th scope="col" class="w-2/5 py-2 text-left font-medium text-ink-muted">
            <span class="sr-only">Share of daily reference intake</span>
            <span aria-hidden="true">% RI</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key" class="border-b border-edge-subtle last:border-0">
          <th scope="row" class="py-2 pr-3 text-left font-normal text-ink">{{ row.label }}</th>

          <td class="py-2 pr-6 text-right whitespace-nowrap text-ink" data-numeric>
            <template v-if="row.formatted !== null">
              {{ row.formatted }}<span class="text-ink-subtle"> {{ row.unit }}</span>
            </template>
            <span v-else class="text-ink-subtle" title="Not reported by the manufacturer">
              &mdash;
            </span>
          </td>

          <td class="py-2">
            <div v-if="row.sharePercent !== null" class="flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-viz-track">
                <div class="h-full rounded-full bg-viz-1" :style="{ width: `${row.barWidth}%` }" />
              </div>
              <span class="w-10 shrink-0 text-right text-caption text-ink-muted" data-numeric>
                {{ row.sharePercent }}%
              </span>
            </div>
            <span v-else class="text-caption text-ink-subtle">
              {{ row.value === null ? '' : 'No reference value' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="declaredCount === 0" class="text-caption text-ink-subtle">
      This product has no nutrition data. Most of the catalogue is contributed by the public, and
      many entries are incomplete.
    </p>
    <p v-else-if="declaredCount < 5" class="text-caption text-ink-subtle">
      Only {{ declaredCount }} of {{ rows.length }} nutrients are reported for this product.
    </p>
  </div>
</template>
