import { describe, expect, it } from 'vitest'
import { FALLBACK_CHART_THEME } from '~~/layers/ui/app/composables/use-chart-theme'
import { LIGHT_TOKENS, resolveToken } from '../../support/css-tokens'

/**
 * The generic chart palette, and the one copy of it the codebase cannot avoid.
 *
 * Charts are drawn to a canvas, so ECharts needs literal colour strings. In the
 * browser those come from the tokens; on the server no stylesheet has been
 * applied, so the composable ships a hard-coded copy of the light theme for the
 * first paint. That copy is exactly the kind of thing that drifts: change a
 * token, forget the fallback, and every cold load flashes the old palette for a
 * frame. Nothing else would report it.
 */

const GENERIC_TOKENS = [
  '--viz-1',
  '--viz-2',
  '--viz-3',
  '--viz-4',
  '--viz-5',
  '--viz-6',
  '--viz-7',
  '--viz-8',
  '--viz-grid',
  '--viz-axis',
  '--viz-track',
  '--content-primary',
  '--content-secondary',
  '--surface-base',
  '--surface-raised',
  '--border-default',
]

describe('the chart palette', () => {
  it('declares every token the composable reads', () => {
    // A missing token is not a crash, it is a silent fall back to the SSR copy
    // that never updates with the theme, so it has to be asserted rather than
    // discovered.
    for (const token of GENERIC_TOKENS) expect(() => resolveToken(token), token).not.toThrow()
  })

  it('matches the tokens it stands in for', () => {
    expect(FALLBACK_CHART_THEME.series).toEqual([
      resolveToken('--viz-1'),
      resolveToken('--viz-2'),
      resolveToken('--viz-3'),
      resolveToken('--viz-4'),
      resolveToken('--viz-5'),
      resolveToken('--viz-6'),
      resolveToken('--viz-7'),
      resolveToken('--viz-8'),
    ])

    expect(FALLBACK_CHART_THEME.grid).toBe(resolveToken('--viz-grid'))
    expect(FALLBACK_CHART_THEME.axis).toBe(resolveToken('--viz-axis'))
    expect(FALLBACK_CHART_THEME.track).toBe(resolveToken('--viz-track'))
    expect(FALLBACK_CHART_THEME.ink).toBe(resolveToken('--content-primary'))
    expect(FALLBACK_CHART_THEME.inkMuted).toBe(resolveToken('--content-secondary'))
    expect(FALLBACK_CHART_THEME.surface).toBe(resolveToken('--surface-base'))
    expect(FALLBACK_CHART_THEME.surfaceRaised).toBe(resolveToken('--surface-raised'))
    expect(FALLBACK_CHART_THEME.edge).toBe(resolveToken('--border-default'))
  })

  /**
   * The layer boundary, asserted rather than trusted.
   *
   * The chart theme used to resolve `--nutriscore-*` and `--nova-*` as well,
   * which made the design system the one place that knew a food catalogue
   * grades things from A to E. Nothing stops that being added back except this.
   */
  it('carries no domain palette', () => {
    expect(Object.keys(FALLBACK_CHART_THEME)).not.toContain('nutriScore')
    expect(Object.keys(FALLBACK_CHART_THEME)).not.toContain('nova')
  })

  /**
   * The bug the conversion path exists for.
   *
   * zrender parses a colour to derive a hover state, and it understands only
   * hex, rgb/rgba and hsl/hsla. A palette in OKLCH renders perfectly and turns
   * transparent under the pointer, which is how it shipped once. The composable
   * now normalises whatever it reads, so this is no longer load-bearing for the
   * tokens as written, and it is still worth pinning: a palette that is legal
   * in tokens.css but unparseable downstream should be a decision, not an
   * accident on a Friday.
   */
  it('is written in a syntax zrender can parse', () => {
    const literals = [...LIGHT_TOKENS.keys()]
      .filter((token) => /^--(viz|nova|nutriscore|primitive)-/.test(token))
      .map((token) => [token, resolveToken(token)] as const)

    expect(literals.length).toBeGreaterThan(20)

    for (const [token, value] of literals) {
      expect(value, `${token} is ${value}`).toMatch(/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i)
    }
  })
})
