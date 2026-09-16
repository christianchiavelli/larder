import { describe, expect, it } from 'vitest'
import { FALLBACK_CHART_THEME } from '~~/layers/ui/app/composables/use-chart-theme'
import { LIGHT_TOKENS, resolveToken } from '../../support/css-tokens'

/**
 * The server has no stylesheet, so the composable ships a hard-coded copy of the
 * light theme. Change a token, forget the copy, and every cold load flashes the
 * old palette for a frame.
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
   * The chart theme used to resolve `--nutriscore-*` too, which made the design
   * system the one place that knew a catalogue grades things A to E.
   */
  it('carries no domain palette', () => {
    expect(Object.keys(FALLBACK_CHART_THEME)).not.toContain('nutriScore')
    expect(Object.keys(FALLBACK_CHART_THEME)).not.toContain('nova')
  })

  /**
   * zrender understands only hex, rgb and hsl, and a palette in OKLCH renders
   * perfectly and turns transparent under the pointer. Today's tokens are hex, so
   * this pins the mechanism rather than the current palette.
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
