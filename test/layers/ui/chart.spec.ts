import { describe, expect, it } from 'vitest'
import {
  BAR_RADIUS,
  CHART_GRID,
  NARROW_CATEGORY_LABELS,
  barValueLabel,
  categoryAxis,
  itemTooltip,
  valueAxis,
} from '~~/layers/ui/app/utils/chart'
import type { ChartTheme } from '~~/layers/ui/app/composables/use-chart-theme'

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

function axisLabelFormatter(axis: unknown): (value: number) => string {
  return (axis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter
}

describe('valueAxis', () => {
  it('compacts the tick labels', () => {
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

  it('drops a tick label that would run into its neighbour on a narrow chart', () => {
    const axis = valueAxis(theme) as unknown as { axisLabel: { hideOverlap: boolean } }

    expect(axis.axisLabel.hideOverlap).toBe(true)
  })
})

describe('NARROW_CATEGORY_LABELS', () => {
  it('applies only to a chart drawn at phone width', () => {
    expect(NARROW_CATEGORY_LABELS.query).toEqual({ maxWidth: 400 })
  })

  it('gives the category labels a width to truncate to, so the bars keep their room', () => {
    expect(NARROW_CATEGORY_LABELS.option.yAxis.axisLabel).toEqual({
      width: 112,
      overflow: 'truncate',
    })
  })
})

describe('categoryAxis', () => {
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

  it('reads the first entry when handed an array', () => {
    expect(formatter((index) => `row ${index}`)([{ dataIndex: 1 }, { dataIndex: 2 }])).toBe('row 1')
  })

  it('renders nothing rather than throwing on an empty array', () => {
    expect(formatter(() => 'unreachable')([])).toBe('')
  })
})

describe('barValueLabel', () => {
  const formatter = (label: unknown) =>
    (label as { formatter: (params: { value?: unknown }) => string }).formatter

  it('compacts the value drawn beside the bar', () => {
    expect(formatter(barValueLabel(theme))({ value: 2400000 })).toBe('2.4M')
  })

  it('draws a zero rather than NaN when the value is missing', () => {
    expect(formatter(barValueLabel(theme))({})).toBe('0')
  })
})

describe('the shared constants', () => {
  it('reserves the right margin the value labels are drawn in', () => {
    expect(CHART_GRID.right).toBeGreaterThan(CHART_GRID.left)
  })

  it('fits the axis labels the way containLabel did, through the option ECharts 6 keeps', () => {
    expect(CHART_GRID).toMatchObject({
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
      outerBoundsClampWidth: 0,
      outerBoundsClampHeight: 0,
    })
    expect(CHART_GRID).not.toHaveProperty('containLabel')
  })

  it('rounds only the end a bar grows towards', () => {
    const [topLeft, topRight, bottomRight, bottomLeft] = BAR_RADIUS
    expect([topLeft, bottomLeft]).toEqual([0, 0])
    expect([topRight, bottomRight]).toEqual([4, 4])
  })
})
