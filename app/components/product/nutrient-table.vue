<script setup lang="ts">
import {
  NUTRIENTS,
  NUTRIENT_KEYS,
  referenceIntakeShare,
  type NutrientProfile,
} from '#shared/domain/nutrition'

const props = defineProps<{ nutrients: NutrientProfile }>()

const { t } = useI18n()
const format = useFormat()

const rows = computed(() =>
  NUTRIENT_KEYS.map((key) => {
    const descriptor = NUTRIENTS[key]
    const value = props.nutrients[key]
    const share = referenceIntakeShare(key, value)

    return {
      key,
      label: t(`nutrients.${key}`),
      unit: descriptor.unit,
      value,
      formatted: value === null ? null : format.measure(value, descriptor.precision),
      share,
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
        {{
          t('nutrientTable.caption')
        }}
      </caption>
      <thead>
        <tr class="border-b border-edge">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted">
            {{ t('nutrientTable.nutrient') }}
          </th>
          <th scope="col" class="py-2 pr-6 text-right font-medium text-ink-muted">
            {{ t('nutrientTable.per100') }}
          </th>
          <th scope="col" class="w-2/5 py-2 text-left font-medium text-ink-muted">
            <span class="sr-only">{{ t('nutrientTable.referenceLong') }}</span>
            <span aria-hidden="true">{{ t('nutrientTable.reference') }}</span>
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
            <span v-else class="text-ink-subtle" :title="t('nutrientTable.notReported')">
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
              {{ row.value === null ? '' : t('nutrientTable.noReference') }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="declaredCount === 0" class="text-caption text-ink-subtle">
      {{ t('nutrientTable.noData') }}
    </p>
    <p v-else-if="declaredCount < 5" class="text-caption text-ink-subtle">
      {{ t('nutrientTable.fewReported', { count: declaredCount, total: rows.length }) }}
    </p>
  </div>
</template>
