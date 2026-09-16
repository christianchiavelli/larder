import { describe, expect, it } from 'vitest'
import {
  BAR_RADIUS,
  CHART_GRID,
  barValueLabel,
  categoryAxis,
  itemTooltip,
  valueAxis,
} from '~~/layers/ui/app/utils/chart'
import type { ChartTheme } from '~~/layers/ui/app/composables/use-chart-theme'

/**
 * The fragments every bar chart is assembled from. Each one is a plain object
 * until ECharts reads it, so a wrong key or a formatter that throws renders an
 * empty canvas rather than failing.
 */

const theme: ChartTheme = {
  series: ['#003cb2'],
  grid: '#ebeff6',
  axis: '#b2b9ca',
  track: '#ebeff6',
  ink: '#002244',
  inkMuted: '#404e6c',
  surface: '#f7f9fc',
  surfaceRaised: '#ffffff',
  edge: '#cfd3db',
}

/** ECharts declares these as unions of every axis kind, so tests narrow once. */
function axisLabelFormatter(axis: unknown): (value: number) => string {
  return (axis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter
}

describe('valueAxis', () => {
  it('compacts the tick labels', () => {
    // A facet count runs to seven digits, and a full one is wider than the
    // chart's left margin.
    expect(axisLabelFormatter(valueAxis(theme))(2_400_000)).toBe('2.4M')
  })

  it('takes its colours from the theme rather than declaring them', () => {
    const axis = valueAxis(theme) as unknown as {
      axisLabel: { color: string }
      splitLine: { lineStyle: { color: string; type: string } }
    }

    expect(axis.axisLabel.color).toBe(theme.inkMuted)
    expect(axis.splitLine.lineStyle.color).toBe(theme.grid)
  })
})

describe('categoryAxis', () => {
  /**
   * Bars read top to bottom in every chart here, and a category axis counts
   * from the bottom up by default, so the largest value would sit last.
   */
  it('runs the categories downwards', () => {
    expect(categoryAxis(theme, ['a', 'b'])).toMatchObject({ inverse: true, data: ['a', 'b'] })
  })

  it('lets a caller add to the label style without dropping the theme colour', () => {
    const axis = categoryAxis(theme, [], { width: 120, overflow: 'truncate' }) as unknown as {
      axisLabel: Record<string, unknown>
    }

    expect(axis.axisLabel).toEqual({ color: theme.ink, width: 120, overflow: 'truncate' })
  })
})

describe('itemTooltip', () => {
  const formatter = (render: (index: number) => string) =>
    (itemTooltip(theme, render) as unknown as { formatter: (params: unknown) => string }).formatter

  it('passes the hovered index to the caller', () => {
    expect(formatter((index) => `row ${index}`)({ dataIndex: 3 })).toBe('row 3')
  })

  /**
   * ECharts hands the formatter an array on a shared axis and a single object
   * on an item trigger. These are all item triggers, and the array branch is
   * the one a shared-axis chart added later would arrive on.
   */
  it('reads the first entry when handed an array', () => {
    expect(formatter((index) => `row ${index}`)([{ dataIndex: 1 }, { dataIndex: 2 }])).toBe('row 1')
  })

  it('renders nothing rather than throwing on an empty array', () => {
    // A hover landing between bars, which reaches the formatter with no entry.
    expect(formatter(() => 'unreachable')([])).toBe('')
  })
})

describe('barValueLabel', () => {
  const formatter = (label: unknown) =>
    (label as { formatter: (params: { value?: unknown }) => string }).formatter

  it('compacts the value drawn beside the bar', () => {
    expect(formatter(barValueLabel(theme))({ value: 2400000 })).toBe('2.4M')
  })

  /**
   * A facet bucket can arrive without a count. Formatting `undefined` would put
   * "NaN" at the end of the bar, which renders and reads as a figure.
   */
  it('draws a zero rather than NaN when the value is missing', () => {
    expect(formatter(barValueLabel(theme))({})).toBe('0')
  })
})

describe('the shared constants', () => {
  it('reserves the right margin the value labels are drawn in', () => {
    // `containLabel` reserves for axis labels only, so a label positioned
    // outside the bar is clipped unless the margin allows for it.
    expect(CHART_GRID.right).toBeGreaterThan(CHART_GRID.left)
    expect(CHART_GRID.containLabel).toBe(true)
  })

  it('rounds only the end a bar grows towards', () => {
    const [topLeft, topRight, bottomRight, bottomLeft] = BAR_RADIUS
    expect([topLeft, bottomLeft]).toEqual([0, 0])
    expect([topRight, bottomRight]).toEqual([4, 4])
  })
})
