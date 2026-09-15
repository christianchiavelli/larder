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
}

/**
 * Colours used before the DOM exists, on the server and the first paint.
 *
 * The light theme's values, because the server has no way to know the visitor's
 * preference and a dark first paint under a light theme is the worse of the two
 * mistakes. They are duplicated from tokens.css and there is no way around it:
 * this runs where no stylesheet has been applied.
 * test/layers/ui/chart-theme.spec.ts resolves the real tokens and compares, so
 * the copy cannot drift unnoticed.
 */
const SSR_FALLBACK: ChartTheme = {
  series: ['#003cb2', '#ad7fe5', '#00a69b', '#ff547c', '#106076', '#009bee', '#b05223', '#968f88'],
  grid: '#ebeff6',
  axis: '#b2b9ca',
  track: '#ebeff6',
  ink: '#002244',
  inkMuted: '#404e6c',
  surface: '#f7f9fc',
  surfaceRaised: '#ffffff',
  edge: '#cfd3db',
}

let rasteriser: CanvasRenderingContext2D | null | undefined

/**
 * Converts any colour the browser understands into `rgb()`.
 *
 * ECharts has to *parse* a colour to derive its hover state, and zrender's
 * parser handles only hex, rgb/rgba and hsl/hsla. Handed anything newer it
 * fails, the derived fill comes out transparent, and the bar under the pointer
 * vanishes. Rendering is unaffected, because a canvas accepts modern colour
 * syntax happily, so the charts look perfect and only emphasis is broken. That
 * is how this shipped once already, when the palette was authored in OKLCH.
 *
 * The palette is hex today, so for every current token this conversion returns
 * what it was given. It stays because the alternative is not less code, it is
 * an unwritten rule that tokens.css may only contain colour syntax from before
 * 2020, enforced by nothing and violated silently. Twenty lines here keep that
 * constraint out of the file a palette is actually edited in.
 *
 * Painting one pixel and reading it back is not the roundabout way to convert,
 * it is the only reliable one. Both obvious shortcuts hand the input straight
 * back: a computed `color` preserves the colour space it was authored in, and
 * so does `ctx.fillStyle`. Nothing yields sRGB until something rasterises.
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
  }
}

/**
 * Bumps whenever the resolved value of a colour token could have changed.
 *
 * Shared, because resolving a token forces a style recalculation and doing it
 * once per palette per theme switch is work with no payoff. It stays at zero
 * until mount: the custom properties are not resolvable before styles apply,
 * and starting at zero means the server and the first client render produce the
 * same tree from the same fallback.
 */
function useThemeRevision() {
  const revision = useState('ui:theme-revision', () => 0)

  onMounted(() => {
    revision.value++

    const observer = new MutationObserver(() => {
      revision.value++
    })

    // Only the class attribute of the root element, which is where the theme
    // toggle writes.
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    onBeforeUnmount(() => observer.disconnect())
  })

  return revision
}

/**
 * Resolves a map of colour tokens, and re-resolves it when the theme changes.
 *
 * Generic on purpose. This layer knows how to read a colour token safely and
 * hand it to a canvas; it does not know which tokens a product has. A palette
 * whose members mean something in a particular domain is assembled by that
 * domain's own code, which is what keeps this file free of any import from it.
 */
export function useThemeColors<K extends string>(
  tokens: Readonly<Record<K, string>>,
  fallback: Readonly<Record<K, string>>,
) {
  const revision = useThemeRevision()

  return computed<Record<K, string>>(() => {
    // Read so the palette re-resolves on a theme change. The number itself
    // carries nothing.
    void revision.value

    if (revision.value === 0 || typeof document === 'undefined') return { ...fallback }

    const styles = getComputedStyle(document.documentElement)
    const entries = Object.entries(tokens) as [K, string][]

    return Object.fromEntries(
      entries.map(([key, token]) => [key, resolveColor(styles, token, fallback[key])]),
    ) as Record<K, string>
  })
}

/**
 * The live chart palette: the generic half, which is the only half this layer
 * has any business knowing about.
 */
export function useChartTheme() {
  const revision = useThemeRevision()

  return computed<ChartTheme>(() =>
    revision.value === 0 || typeof document === 'undefined' ? SSR_FALLBACK : readTheme(),
  )
}

export { SSR_FALLBACK as FALLBACK_CHART_THEME }
