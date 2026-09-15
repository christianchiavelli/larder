<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import {
  NUTRI_SCORE_LABELS,
  NUTRI_SCORE_SHORT_LABELS,
  NUTRI_SCORE_VALUES,
  type NutriScore,
} from '#shared/domain/nutrition'

/**
 * Distribution of Nutri-Score grades across a result set.
 *
 * A bar chart rather than a donut. The grades are an ordered scale from A to E,
 * and a donut arranges them in a ring where that order is arbitrary and the
 * lengths cannot be compared. Bars on a shared baseline preserve both.
 *
 * The two ungraded bars are shown rather than dropped, and shown apart. They
 * are routinely most of the catalogue, so hiding them would imply the graded
 * products are the whole population and overstate every percentage on the page.
 * Keeping them apart is the same argument one level down: "nobody has graded
 * this yet" and "the scheme does not grade this" are different findings, and a
 * single bar would report the second as though it were more of the first.
 */
const props = defineProps<{
  distribution: Partial<Record<NutriScore, number>>
  loading?: boolean
}>()

const theme = useChartTheme()
const grades = useNutriScorePalette()

const entries = computed(() =>
  NUTRI_SCORE_VALUES.map((grade) => ({ grade, count: props.distribution[grade] ?? 0 })),
)

const total = computed(() => entries.value.reduce((sum, entry) => sum + entry.count, 0))

const share = (count: number) => formatShare(count, total.value)

const option = computed<EChartsOption>(() => ({
  aria: CHART_ARIA,
  grid: CHART_GRID,
  xAxis: valueAxis(theme.value),
  yAxis: categoryAxis(
    theme.value,
    // The same glyphs the badges use, so the chart and the rows below it agree
    // without a legend between them.
    entries.value.map((entry) => NUTRI_SCORE_SHORT_LABELS[entry.grade]),
    // Heavier than a category name, because these are the grades themselves.
    { fontWeight: 600 },
  ),
  tooltip: itemTooltip(theme.value, (index) => {
    const entry = entries.value[index]
    if (!entry) return ''
    return `${NUTRI_SCORE_LABELS[entry.grade]}<br>${formatCount(entry.count)} (${share(entry.count)})`
  }),
  series: [
    {
      type: 'bar',
      data: entries.value.map((entry) => ({
        value: entry.count,
        // Each bar carries the grade's own regulated colour, so the chart and
        // the badges on the cards below agree without a legend.
        itemStyle: { color: grades.value[entry.grade], borderRadius: BAR_RADIUS },
      })),
      barMaxWidth: 28,
      label: barValueLabel(theme.value),
    },
  ],
}))

const dataTable = computed(() => ({
  columns: ['Nutri-Score', 'Products', 'Share'],
  rows: entries.value.map((entry) => [
    NUTRI_SCORE_LABELS[entry.grade],
    formatCount(entry.count),
    share(entry.count),
  ]),
}))
</script>

<template>
  <UiChart
    :option="option"
    :loading="loading"
    title="Products by Nutri-Score grade"
    height="16rem"
    :data-table="dataTable"
  />
</template>
