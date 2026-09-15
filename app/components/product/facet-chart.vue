<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { FacetItem } from '#shared/domain/search'

/**
 * Top values of one facet dimension, as horizontal bars.
 *
 * Horizontal because these are category names, and vertical bars would force
 * them to be rotated, truncated, or set in a size nobody can read.
 *
 * A single hue rather than the categorical palette: the bars are one series
 * measured on one axis, and colouring each differently would imply a grouping
 * that does not exist. Colour is reserved for encoding something.
 */
const props = withDefaults(
  defineProps<{
    title: string
    items: FacetItem[]
    limit?: number
    loading?: boolean
  }>(),
  { limit: 8, loading: false },
)

const theme = useChartTheme()
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

const top = computed(() => [...props.items].sort((a, b) => b.count - a.count).slice(0, props.limit))

/** Long taxonomy names need a ceiling, or the plot area disappears. */
function truncate(label: string, max = 28): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

const option = computed<EChartsOption>(() => ({
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
    data: top.value.map((item) => truncate(item.label)),
    axisLabel: { color: theme.value.ink },
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
    // See the note in nutri-score-chart.vue on why this narrows.
    formatter: (params) => {
      const first = Array.isArray(params) ? params[0] : params
      const item = first ? top.value[first.dataIndex] : undefined
      // The tooltip carries the untruncated label, which is the only place a
      // pointer user can read the full name.
      return item ? `${item.label}<br>${numberFormatter.format(item.count)} products` : ''
    },
  },
  series: [
    {
      type: 'bar',
      data: top.value.map((item) => item.count),
      itemStyle: { color: theme.value.series[0], borderRadius: [0, 4, 4, 0] },
      barMaxWidth: 20,
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
  columns: [props.title, 'Products'],
  rows: top.value.map((item) => [item.label, numberFormatter.format(item.count)]),
}))
</script>

<template>
  <UiChart
    :option="option"
    :loading="loading"
    :title="`Top ${title.toLowerCase()} by number of products`"
    height="18rem"
    :data-table="dataTable"
  />
</template>
