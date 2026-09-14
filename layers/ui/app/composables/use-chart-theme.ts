/**
 * Reads the chart palette out of CSS custom properties.
 *
 * Charts are drawn to a canvas, so they cannot inherit a colour the way an
 * element can: every value has to be handed to ECharts as a literal string. The
 * obvious shortcut is to keep a second palette in TypeScript, and it is a trap.
 * The two copies drift, and the failure is silent, because a chart with
 * slightly wrong colours still renders.
 *
 * So the tokens stay the single source and this reads them back at runtime.
 * That also makes theme switching work without re-declaring anything: when
 * `.dark` changes the custom properties, re-reading them produces the new
 * palette.
 */

const VIZ_SERIES_TOKENS = [
  '--viz-1',
  '--viz-2',
  '--viz-3',
  '--viz-4',
  '--viz-5',
  '--viz-6',
  '--viz-7',
  '--viz-8',
] as const

export interface ChartTheme {
  series: string[]
  grid: string
  axis: string
  track: string
  ink: string
  inkMuted: string
  surface: string
  surfaceRaised: string
  edge: string
  nutriScore: Record<'a' | 'b' | 'c' | 'd' | 'e' | 'unknown', string>
  nova: Record<1 | 2 | 3 | 4 | 'unknown', string>
}

/** Colours used before the DOM exists, on the server and the first paint. */
const SSR_FALLBACK: ChartTheme = {
  series: ['#3f7d5c', '#5b6bb5', '#b8863f', '#9a4f7a', '#4a8b96', '#b05741', '#6f9a52', '#6a5f9e'],
  grid: '#e5e7e6',
  axis: '#a3a5a4',
  track: '#e5e7e6',
  ink: '#1c211f',
  inkMuted: '#5f6663',
  surface: '#fafafa',
  surfaceRaised: '#ffffff',
  edge: '#d5d8d7',
  nutriScore: {
    a: '#038141',
    b: '#85bb2f',
    c: '#fecb02',
    d: '#ee8100',
    e: '#e63e11',
    unknown: '#d5d8d7',
  },
  nova: { 1: '#3f7d5c', 2: '#b3ad3a', 3: '#c4823a', 4: '#c0553a', unknown: '#d5d8d7' },
}

function readToken(styles: CSSStyleDeclaration, token: string, fallback: string): string {
  const value = styles.getPropertyValue(token).trim()
  return value.length > 0 ? value : fallback
}

function readTheme(): ChartTheme {
  if (typeof window === 'undefined') return SSR_FALLBACK

  const styles = getComputedStyle(document.documentElement)

  return {
    series: VIZ_SERIES_TOKENS.map((token, index) =>
      readToken(styles, token, SSR_FALLBACK.series[index]!),
    ),
    grid: readToken(styles, '--viz-grid', SSR_FALLBACK.grid),
    axis: readToken(styles, '--viz-axis', SSR_FALLBACK.axis),
    track: readToken(styles, '--viz-track', SSR_FALLBACK.track),
    ink: readToken(styles, '--content-primary', SSR_FALLBACK.ink),
    inkMuted: readToken(styles, '--content-secondary', SSR_FALLBACK.inkMuted),
    surface: readToken(styles, '--surface-base', SSR_FALLBACK.surface),
    surfaceRaised: readToken(styles, '--surface-raised', SSR_FALLBACK.surfaceRaised),
    edge: readToken(styles, '--border-default', SSR_FALLBACK.edge),
    nutriScore: {
      a: readToken(styles, '--nutriscore-a', SSR_FALLBACK.nutriScore.a),
      b: readToken(styles, '--nutriscore-b', SSR_FALLBACK.nutriScore.b),
      c: readToken(styles, '--nutriscore-c', SSR_FALLBACK.nutriScore.c),
      d: readToken(styles, '--nutriscore-d', SSR_FALLBACK.nutriScore.d),
      e: readToken(styles, '--nutriscore-e', SSR_FALLBACK.nutriScore.e),
      unknown: readToken(styles, '--nutriscore-unknown', SSR_FALLBACK.nutriScore.unknown),
    },
    nova: {
      1: readToken(styles, '--nova-1', SSR_FALLBACK.nova[1]),
      2: readToken(styles, '--nova-2', SSR_FALLBACK.nova[2]),
      3: readToken(styles, '--nova-3', SSR_FALLBACK.nova[3]),
      4: readToken(styles, '--nova-4', SSR_FALLBACK.nova[4]),
      unknown: readToken(styles, '--nova-unknown', SSR_FALLBACK.nova.unknown),
    },
  }
}

/**
 * The live chart palette.
 *
 * Shared across every chart on the page: reading computed styles forces a style
 * recalculation, and doing it once per chart on every theme switch is work with
 * no payoff. The observer watches only the class attribute of the root element,
 * which is where the theme toggle writes.
 */
export function useChartTheme() {
  const theme = useState<ChartTheme>('chart-theme', () => SSR_FALLBACK)

  onMounted(() => {
    // The custom properties are only resolvable once styles have applied.
    theme.value = readTheme()

    const observer = new MutationObserver(() => {
      theme.value = readTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    onBeforeUnmount(() => observer.disconnect())
  })

  return theme
}

export { SSR_FALLBACK as FALLBACK_CHART_THEME }
