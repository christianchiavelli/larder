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

function toRgb(value: string): string | null {
  if (rasteriser === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    rasteriser = canvas.getContext('2d', { willReadFrequently: true })
  }

  if (!rasteriser) return null

  rasteriser.fillStyle = '#000000'
  rasteriser.fillStyle = value
  rasteriser.clearRect(0, 0, 1, 1)
  rasteriser.fillRect(0, 0, 1, 1)

  const [r, g, b, a] = rasteriser.getImageData(0, 0, 1, 1).data
  if (r === undefined || g === undefined || b === undefined || a === undefined) return null

  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

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

function useThemeRevision() {
  const revision = useState('ui:theme-revision', () => 0)

  onMounted(() => {
    revision.value++

    const observer = new MutationObserver(() => {
      revision.value++
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    onBeforeUnmount(() => observer.disconnect())
  })

  return revision
}

export function useThemeColors<K extends string>(
  tokens: Readonly<Record<K, string>>,
  fallback: Readonly<Record<K, string>>,
) {
  const revision = useThemeRevision()

  return computed<Record<K, string>>(() => {
    void revision.value

    if (revision.value === 0 || typeof document === 'undefined') return { ...fallback }

    const styles = getComputedStyle(document.documentElement)
    const entries = Object.entries(tokens) as [K, string][]

    return Object.fromEntries(
      entries.map(([key, token]) => [key, resolveColor(styles, token, fallback[key])]),
    ) as Record<K, string>
  })
}

export function useChartTheme() {
  const revision = useThemeRevision()

  return computed<ChartTheme>(() =>
    revision.value === 0 || typeof document === 'undefined' ? SSR_FALLBACK : readTheme(),
  )
}

export { SSR_FALLBACK as FALLBACK_CHART_THEME }
