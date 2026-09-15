<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { NUTRI_SCORE_GRADES, type NutriScore } from '#shared/domain/nutrition'

/**
 * Distribution of Nutri-Score grades across a result set.
 *
 * A bar chart rather than a donut. The grades are an ordered scale from A to E,
 * and a donut arranges them in a ring where that order is arbitrary and the
 * lengths cannot be compared. Bars on a shared baseline preserve both.
 *
 * "Unknown" is shown rather than dropped. It is routinely the largest bucket in
 * this catalogue, and hiding it would imply the graded products are the whole
 * population, which would overstate every percentage on the page.
 */
const props = defineProps<{
  distribution: Partial<Record<NutriScore, number>>
  loading?: boolean
}>()

const theme = useChartTheme()

const ORDER: NutriScore[] = [...NUTRI_SCORE_GRADES, 'unknown']

const entries = computed(() =>
  ORDER.map((grade) => ({ grade, count: props.distribution[grade] ?? 0 })),
)

const total = computed(() => entries.value.reduce((sum, entry) => sum + entry.count, 0))

const numberFormatter = new Intl.NumberFormat('en')

/**
 * Axis ticks use compact notation because these counts run into the millions,
 * and "2,395,620" repeated across an axis overlaps into an unreadable smear at
 * any width this chart is given. Full precision stays in the tooltip, the bar
 * labels and the data table.
 */
const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function share(count: number): string {
  if (total.value === 0) return '0%'
  return `${((count / total.value) * 100).toFixed(1)}%`
}

const option = computed<EChartsOption>(() => ({
  // The library's own accessibility layer is left off: it generates a prose
  // description that is worse than the real table UiChart renders.
  aria: { enabled: false },
  // Right margin holds the value labels; containLabel does not reserve for them.
  grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    axisLabel: {
      color: theme.value.inkMuted,
      formatter: (value: number) => compactFormatter.format(value),
    },
    splitLine: { lineStyle: { color: theme.value.grid, type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: entries.value.map((entry) =>
      entry.grade === 'unknown' ? 'N/A' : entry.grade.toUpperCase(),
    ),
    axisLabel: { color: theme.value.ink, fontWeight: 600 },
    // No axis rule and no ticks. The category labels already anchor the bars,
    // and a heavy vertical line competes with the data it is supposed to frame.
    axisLine: { show: false },
    axisTick: { show: false },
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: theme.value.surfaceRaised,
    borderColor: theme.value.edge,
    textStyle: { color: theme.value.ink },
    // ECharts types the callback as item-or-array because a shared-axis
    // trigger passes every series at once. This one is `trigger: 'item'`, so
    // it is always a single entry, but narrowing is cheaper than asserting.
    formatter: (params) => {
      const first = Array.isArray(params) ? params[0] : params
      const entry = first ? entries.value[first.dataIndex] : undefined
      if (!entry) return ''
      const name = entry.grade === 'unknown' ? 'No grade' : `Grade ${entry.grade.toUpperCase()}`
      return `${name}<br>${numberFormatter.format(entry.count)} (${share(entry.count)})`
    },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map((entry) => ({
        value: entry.count,
        // Each bar carries the grade's own regulated colour, so the chart and
        // the badges on the cards below agree without a legend.
        itemStyle: { color: theme.value.nutriScore[entry.grade], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 28,
      /**
       * One bucket routinely holds two thirds of the catalogue, which leaves
       * the graded bars a few pixels long. The label is what keeps a short bar
       * legible: without it the chart shows that most products are ungraded and
       * nothing else.
       */
      label: {
        show: true,
        position: 'right',
        color: theme.value.inkMuted,
        fontSize: 11,
        // `value` is typed as the whole union a dataset cell can hold, so it
        // is coerced rather than asserted.
        formatter: (params) => compactFormatter.format(Number(params.value ?? 0)),
      },
    },
  ],
}))

const dataTable = computed(() => ({
  columns: ['Nutri-Score', 'Products', 'Share'],
  rows: entries.value.map((entry) => [
    entry.grade === 'unknown' ? 'No grade' : entry.grade.toUpperCase(),
    numberFormatter.format(entry.count),
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
