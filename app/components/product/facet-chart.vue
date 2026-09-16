<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { FacetItem } from '#shared/domain/search'

/**
 * Horizontal because these are category names. One hue, since the bars are one
 * series on one axis.
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
const top = computed(() => [...props.items].sort((a, b) => b.count - a.count).slice(0, props.limit))

/** Long taxonomy names need a ceiling, or the plot area disappears. */
function truncate(label: string, max = 28): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

const option = computed<EChartsOption>(() => ({
  aria: CHART_ARIA,
  grid: CHART_GRID,
  xAxis: valueAxis(theme.value),
  yAxis: categoryAxis(
    theme.value,
    top.value.map((item) => truncate(item.label)),
  ),
  tooltip: itemTooltip(theme.value, (index) => {
    const item = top.value[index]
    // The tooltip carries the untruncated label, which is the only place a
    // pointer user can read the full name.
    return item ? `${item.label}<br>${formatCount(item.count)} products` : ''
  }),
  series: [
    {
      type: 'bar',
      data: top.value.map((item) => item.count),
      itemStyle: { color: theme.value.series[0], borderRadius: BAR_RADIUS },
      barMaxWidth: 20,
      label: barValueLabel(theme.value),
    },
  ],
}))

const dataTable = computed(() => ({
  columns: [props.title, 'Products'],
  rows: top.value.map((item) => [item.label, formatCount(item.count)]),
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
