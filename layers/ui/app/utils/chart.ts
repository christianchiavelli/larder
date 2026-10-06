import type { BarSeriesOption, EChartsOption } from 'echarts'
import type { ChartTheme } from '../composables/use-chart-theme'

/** Writes a number short enough for an axis tick or a bar's end, in the page's language. */
type CompactFormat = (value: number) => string

export const CHART_ARIA = { enabled: false } as const

export const CHART_GRID = {
  left: 8,
  right: 48,
  top: 8,
  bottom: 8,
  outerBoundsMode: 'same',
  outerBoundsContain: 'axisLabel',
  outerBoundsClampWidth: 0,
  outerBoundsClampHeight: 0,
} as const

export const NARROW_CATEGORY_LABELS = {
  query: { maxWidth: 400 },
  option: { yAxis: { axisLabel: { width: 112, overflow: 'truncate' } } },
} as const satisfies NonNullable<EChartsOption['media']>[number]

export function valueAxis(theme: ChartTheme, compact: CompactFormat): EChartsOption['xAxis'] {
  return {
    type: 'value',
    axisLabel: {
      color: theme.inkMuted,
      formatter: (value: number) => compact(value),
      hideOverlap: true,
    },
    splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } },
  }
}

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

export function barValueLabel(theme: ChartTheme, compact: CompactFormat): BarSeriesOption['label'] {
  return {
    show: true,
    position: 'right',
    color: theme.inkMuted,
    fontSize: 11,
    formatter: (params) => compact(Number(params.value ?? 0)),
  }
}

export const BAR_RADIUS: number[] = [0, 4, 4, 0]
