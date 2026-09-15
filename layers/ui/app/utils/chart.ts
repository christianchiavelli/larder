import type { BarSeriesOption, EChartsOption } from 'echarts'
import type { ChartTheme } from '../composables/use-chart-theme'

/**
 * The pieces every chart in this product shares.
 *
 * Fragments rather than a `makeChart(options)` wrapper. A wrapper over ECharts
 * is a second API to learn, and it grows a parameter every time a chart needs
 * something the wrapper did not anticipate. These are each small enough to read
 * at the call site, and a chart composes the ones it wants.
 *
 * What they remove is real: two horizontal bar charts held the same grid, the
 * same axis styling, the same tooltip shell and the same value label, along
 * with copies of the comments explaining each of those decisions. Duplicated
 * reasoning is the part that drifts, because the second copy is the one nobody
 * remembers to change.
 */

/**
 * The library's own accessibility layer, off.
 *
 * It generates a prose description of the series that is worse than the real
 * table `UiChart` renders beside every chart.
 */
export const CHART_ARIA = { enabled: false } as const

/** Right margin holds the value labels; `containLabel` does not reserve for them. */
export const CHART_GRID = { left: 8, right: 48, top: 8, bottom: 8, containLabel: true } as const

/** A quantity axis: compact ticks and a dashed rule behind the bars. */
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

/**
 * A label axis, reading downwards.
 *
 * No axis rule and no ticks: the labels already anchor the bars, and a heavy
 * vertical line competes with the data it is supposed to frame.
 */
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
 * A tooltip in the page's own colours, with the caller's content.
 *
 * ECharts types the formatter argument as item-or-array because a shared-axis
 * trigger passes every series at once. These are all `trigger: 'item'`, so it
 * is always a single entry, and the helper narrows once here rather than every
 * chart asserting it.
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
 * The figure printed past the end of a bar.
 *
 * Not decoration. One bucket in this catalogue routinely holds two thirds of
 * everything, which leaves the other bars a few pixels long; the label is what
 * keeps a short bar legible at all.
 */
export function barValueLabel(theme: ChartTheme): BarSeriesOption['label'] {
  return {
    show: true,
    position: 'right',
    color: theme.inkMuted,
    fontSize: 11,
    // `value` is typed as the whole union a dataset cell can hold, so it is
    // coerced rather than asserted.
    formatter: (params) => formatCompact(Number(params.value ?? 0)),
  }
}

/** Bars run left to right, so only the trailing corners are rounded. */
export const BAR_RADIUS: number[] = [0, 4, 4, 0]
