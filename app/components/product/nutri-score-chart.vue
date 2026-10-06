<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { NUTRI_SCORE_VALUES, type NutriScore } from '#shared/domain/nutrition'

const props = defineProps<{
  distribution: Partial<Record<NutriScore, number>>
  loading?: boolean
}>()

const { t } = useI18n()
const format = useFormat()
const theme = useChartTheme()
const grades = useNutriScorePalette()

const entries = computed(() =>
  NUTRI_SCORE_VALUES.map((grade) => ({ grade, count: props.distribution[grade] ?? 0 })),
)

const total = computed(() => entries.value.reduce((sum, entry) => sum + entry.count, 0))

const share = (count: number) => format.share(count, total.value)
const gradeName = (grade: NutriScore) => t(`nutriScore.grade.${nutriScoreKey(grade)}`)

const option = computed<EChartsOption>(() => ({
  aria: CHART_ARIA,
  grid: CHART_GRID,
  xAxis: valueAxis(theme.value, format.compact),
  yAxis: categoryAxis(
    theme.value,
    entries.value.map((entry) => t(`nutriScore.short.${nutriScoreKey(entry.grade)}`)),
    { fontWeight: 600 },
  ),
  tooltip: itemTooltip(theme.value, (index) => {
    const entry = entries.value[index]
    if (!entry) return ''
    return `${gradeName(entry.grade)}<br>${format.count(entry.count)} (${share(entry.count)})`
  }),
  series: [
    {
      type: 'bar',
      data: entries.value.map((entry) => ({
        value: entry.count,
        itemStyle: { color: grades.value[entry.grade], borderRadius: BAR_RADIUS },
      })),
      barMaxWidth: 28,
      label: barValueLabel(theme.value, format.compact),
    },
  ],
}))

const dataTable = computed(() => ({
  columns: ['Nutri-Score', t('charts.productsColumn'), t('charts.shareColumn')],
  rows: entries.value.map((entry) => [
    gradeName(entry.grade),
    format.count(entry.count),
    share(entry.count),
  ]),
}))
</script>

<template>
  <UiChart
    :option="option"
    :loading="loading"
    :title="t('charts.nutriScoreTitle')"
    height="16rem"
    :data-table="dataTable"
  />
</template>
