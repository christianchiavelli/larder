import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import type { EChartsOption } from 'echarts'
import { computed } from 'vue'
import { useChartTheme } from '../composables/use-chart-theme'
import { useFormat } from '../composables/use-format'
import {
  BAR_RADIUS,
  CHART_ARIA,
  CHART_GRID,
  barValueLabel,
  categoryAxis,
  valueAxis,
} from '../utils/chart'
import UiChart from './chart.vue'

// The catalogue's five largest categories on 5 October 2026, as Open Food Facts' search counted them.
const ROWS: ReadonlyArray<readonly [string, number]> = [
  ['Plant-based foods and beverages', 484_736],
  ['Plant-based foods', 422_246],
  ['Snacks', 290_398],
  ['Sugary snacks', 213_883],
  ['Drinks', 184_159],
]

/**
 * An ECharts chart drawn in the browser only, its colours read from the theme's
 * tokens, with the same figures as a table for screen readers.
 */
const meta = {
  title: 'Design system/Chart',
  component: UiChart,
  args: {
    title: 'Products by category',
    height: '18rem',
    option: {},
    dataTable: {
      columns: ['Category', 'Products'],
      rows: ROWS.map(([label, count]) => [label, count]),
    },
  },
  argTypes: { option: { control: false }, dataTable: { control: false } },
  render: (args) => ({
    components: { UiChart },
    setup() {
      const theme = useChartTheme()
      const format = useFormat()
      const option = computed<EChartsOption>(() => ({
        aria: CHART_ARIA,
        grid: CHART_GRID,
        xAxis: valueAxis(theme.value, format.compact),
        yAxis: categoryAxis(
          theme.value,
          ROWS.map(([label]) => label),
        ),
        series: [
          {
            type: 'bar',
            data: ROWS.map(([, count]) => count),
            itemStyle: { color: theme.value.series[0], borderRadius: BAR_RADIUS },
            barMaxWidth: 20,
            label: barValueLabel(theme.value, format.compact),
          },
        ],
      }))
      return { args, option }
    },
    template: '<UiChart v-bind="args" :option="option" />',
  }),
} satisfies Meta<typeof UiChart>

export default meta
type Story = StoryObj<typeof meta>

/** Horizontal bars, the largest first, each labelled with its value. */
export const Bars: Story = {}

/** While its data is on its way, the chart keeps its height, so nothing below it moves. */
export const Loading: Story = { args: { loading: true } }
