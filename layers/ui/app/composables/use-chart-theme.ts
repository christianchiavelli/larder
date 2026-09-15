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
 *
 * Colours are converted to `rgb()` on the way out. See `resolveColor`.
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
  series: ['#2b6b76', '#5a54a8', '#3f8a72', '#8d4a77', '#4d7aa8', '#3d6b4a', '#6b7fc4', '#4a7a8c'],
  grid: '#e8e5e0',
  axis: '#a9a49c',
  track: '#e8e5e0',
  ink: '#241f19',
  inkMuted: '#6b6459',
  surface: '#faf9f7',
  surfaceRaised: '#ffffff',
  edge: '#d6d1c9',
  nutriScore: {
    a: '#038141',
    b: '#85bb2f',
    c: '#fecb02',
    d: '#ee8100',
    e: '#e63e11',
    unknown: '#d6d1c9',
  },
  nova: { 1: '#3f8a5c', 2: '#b3a53a', 3: '#c4823a', 4: '#c0553a', unknown: '#d6d1c9' },
}

let rasteriser: CanvasRenderingContext2D | null | undefined

/**
 * Converts any colour the browser understands into `rgb()`.
 *
 * This is the whole reason the composable does not simply return
 * `getPropertyValue('--viz-1')`. The palette is authored in OKLCH and a canvas
 * accepts `oklch()` happily, so every chart renders correctly. But ECharts has
 * to *parse* a colour to derive its hover state, and zrender's parser predates
 * OKLCH and handles only hex, rgb/rgba and hsl/hsla. Given `oklch(...)` it
 * fails, the derived colour comes out transparent, and the bar under the
 * pointer vanishes. Rendering is fine; only emphasis breaks, which is exactly
 * the kind of bug that reaches a user rather than a test.
 *
 * Painting one pixel and reading it back is the conversion, and it is not the
 * roundabout way of doing this, it is the only reliable one. Both of the
 * obvious shortcuts return OKLCH untouched: a computed `color` preserves the
 * colour space it was authored in, and so does `ctx.fillStyle`. Nothing hands
 * back sRGB until something actually rasterises, so that is what this does.
 */
function toRgb(value: string): string | null {
  if (rasteriser === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    rasteriser = canvas.getContext('2d', { willReadFrequently: true })
  }

  if (!rasteriser) return null

  // A colour the browser rejects leaves fillStyle at its previous value, so it
  // is reset to a known sentinel first and any unchanged result is treated as
  // a parse failure rather than silently painting the wrong colour.
  rasteriser.fillStyle = '#000000'
  rasteriser.fillStyle = value
  rasteriser.clearRect(0, 0, 1, 1)
  rasteriser.fillRect(0, 0, 1, 1)

  const [r, g, b, a] = rasteriser.getImageData(0, 0, 1, 1).data
  if (r === undefined || g === undefined || b === undefined || a === undefined) return null

  // Alpha comes back 0-255; ECharts wants the CSS 0-1 form.
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

/** Reads a custom property and hands it over in a form ECharts can parse. */
function resolveColor(styles: CSSStyleDeclaration, token: string, fallback: string): string {
  const raw = styles.getPropertyValue(token).trim()
  if (raw.length === 0) return fallback
  return toRgb(raw) ?? fallback
}

function readTheme(): ChartTheme {
  if (typeof window === 'undefined' || typeof document === 'undefined') return SSR_FALLBACK

  const styles = getComputedStyle(document.documentElement)

  return {
    series: VIZ_SERIES_TOKENS.map((token, index) =>
      resolveColor(styles, token, SSR_FALLBACK.series[index]!),
    ),
    grid: resolveColor(styles, '--viz-grid', SSR_FALLBACK.grid),
    axis: resolveColor(styles, '--viz-axis', SSR_FALLBACK.axis),
    track: resolveColor(styles, '--viz-track', SSR_FALLBACK.track),
    ink: resolveColor(styles, '--content-primary', SSR_FALLBACK.ink),
    inkMuted: resolveColor(styles, '--content-secondary', SSR_FALLBACK.inkMuted),
    surface: resolveColor(styles, '--surface-base', SSR_FALLBACK.surface),
    surfaceRaised: resolveColor(styles, '--surface-raised', SSR_FALLBACK.surfaceRaised),
    edge: resolveColor(styles, '--border-default', SSR_FALLBACK.edge),
    nutriScore: {
      a: resolveColor(styles, '--nutriscore-a', SSR_FALLBACK.nutriScore.a),
      b: resolveColor(styles, '--nutriscore-b', SSR_FALLBACK.nutriScore.b),
      c: resolveColor(styles, '--nutriscore-c', SSR_FALLBACK.nutriScore.c),
      d: resolveColor(styles, '--nutriscore-d', SSR_FALLBACK.nutriScore.d),
      e: resolveColor(styles, '--nutriscore-e', SSR_FALLBACK.nutriScore.e),
      unknown: resolveColor(styles, '--nutriscore-unknown', SSR_FALLBACK.nutriScore.unknown),
    },
    nova: {
      1: resolveColor(styles, '--nova-1', SSR_FALLBACK.nova[1]),
      2: resolveColor(styles, '--nova-2', SSR_FALLBACK.nova[2]),
      3: resolveColor(styles, '--nova-3', SSR_FALLBACK.nova[3]),
      4: resolveColor(styles, '--nova-4', SSR_FALLBACK.nova[4]),
      unknown: resolveColor(styles, '--nova-unknown', SSR_FALLBACK.nova.unknown),
    },
  }
}

/**
 * The live chart palette.
 *
 * Shared across every chart on the page: resolving colours forces a style
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
