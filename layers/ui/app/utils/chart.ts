import type { BarSeriesOption, EChartsOption } from 'echarts'
import { formatCompact } from './format'
import type { ChartTheme } from '../composables/use-chart-theme'

/**
 * Fragments rather than a `makeChart()` wrapper, which would be a second API
 * that grows a parameter per chart.
 */

/** Its prose description is worse than the real table `UiChart` renders. */
export const CHART_ARIA = { enabled: false } as const

/** Right margin holds the value labels; `containLabel` does not reserve for them. */
export const CHART_GRID = { left: 8, right: 48, top: 8, bottom: 8, containLabel: true } as const

/** Compact ticks, dashed rule. */
export function valueAxis(theme: ChartTheme): EChartsOption['xAxis'] {
  return {
    type: 'value',
    axisLabel: {
      color: theme.inkMuted,
      formatter: (value: number) => formatCompact(value),
    },
    splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } },
  }
}

/** No rule and no ticks: the labels already anchor the bars. */
export function categoryAxis(
  theme: ChartTheme,
  data: string[],
  labelStyle: Record<string, unknown> = {},
): EChartsOption['yAxis'] {
  return {
    type: 'category',
    inverse: true,
    data,
    axisLabel: { color: theme.ink, ...labelStyle },
    axisLine: { show: false },
    axisTick: { show: false },
  }
}

/**
 * ECharts types the formatter argument as item-or-array for shared-axis
 * triggers. These are all `trigger: 'item'`.
 */
export function itemTooltip(
  theme: ChartTheme,
  render: (dataIndex: number) => string,
): EChartsOption['tooltip'] {
  return {
    trigger: 'item',
    backgroundColor: theme.surfaceRaised,
    borderColor: theme.edge,
    textStyle: { color: theme.ink },
    formatter: (params) => {
      const first = Array.isArray(params) ? params[0] : params
      return first ? render(first.dataIndex as number) : ''
    },
  }
}

/**
 * One bucket routinely holds two thirds of the catalogue, leaving the rest a few
 * pixels long. The label is what keeps a short bar legible.
 */
export function barValueLabel(theme: ChartTheme): BarSeriesOption['label'] {
  return {
    show: true,
    position: 'right',
    color: theme.inkMuted,
    fontSize: 11,
    formatter: (params) => formatCompact(Number(params.value ?? 0)),
  }
}

/** Bars run left to right, so only the trailing corners are rounded. */
export const BAR_RADIUS: number[] = [0, 4, 4, 0]
