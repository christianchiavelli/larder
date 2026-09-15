import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FALLBACK_CHART_THEME } from '../../layers/ui/app/composables/use-chart-theme'

/**
 * The one duplicated palette in the codebase, kept honest.
 *
 * Charts are drawn to a canvas, so ECharts needs literal colour strings. In the
 * browser those come from the tokens; on the server no stylesheet has been
 * applied, so the composable ships a hard-coded copy of the light theme for the
 * first paint. That copy is unavoidable and it is exactly the kind of thing
 * that drifts: change a token, forget the fallback, and charts flash the old
 * palette for one frame on every cold load. Nothing else would report it.
 *
 * So the tokens are parsed here and compared. This is a text-level parse rather
 * than a browser measurement on purpose, because a browser would only tell us
 * about the theme it happens to be rendering.
 */

const TOKENS = readFileSync(
  fileURLToPath(new URL('../../layers/ui/app/assets/css/tokens.css', import.meta.url)),
  'utf8',
)

/** Custom properties declared in one block, as written. */
function declarationsIn(selector: string): Map<string, string> {
  // Non-greedy up to the first closing brace at the start of a line, which is
  // how every block in tokens.css ends. Nested blocks would break this; there
  // are none, and a nested block inside a token file would be the real problem.
  const block = new RegExp(`^${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(TOKENS)
  if (!block?.[1]) throw new Error(`tokens.css has no ${selector} block`)

  const declarations = new Map<string, string>()
  for (const [, name, value] of block[1].matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    // Strip trailing comments, which several values carry to record how they
    // were derived.
    declarations.set(name!, value!.replace(/\/\*[\s\S]*?\*\//g, '').trim())
  }
  return declarations
}

const ROOT = declarationsIn(':root')

/** Follows `var()` chains down to the literal the browser would compute. */
function resolve(token: string, seen = new Set<string>()): string {
  if (seen.has(token)) throw new Error(`${token} resolves in a cycle`)
  seen.add(token)

  const value = ROOT.get(token)
  if (value === undefined) throw new Error(`${token} is not declared in :root`)

  const reference = /^var\((--[\w-]+)\)$/.exec(value)
  return reference ? resolve(reference[1]!, seen) : value
}

describe('the chart palette', () => {
  it('declares every token the composable reads', () => {
    const tokens = [
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
      '--nutriscore-a',
      '--nutriscore-b',
      '--nutriscore-c',
      '--nutriscore-d',
      '--nutriscore-e',
      '--nutriscore-unknown',
      '--nova-1',
      '--nova-2',
      '--nova-3',
      '--nova-4',
      '--nova-unknown',
    ]

    // A missing token is not a crash, it is a silent fall back to the SSR copy
    // that never updates with the theme, so it has to be asserted rather than
    // discovered.
    for (const token of tokens) expect(() => resolve(token), token).not.toThrow()
  })

  it('matches the tokens it stands in for', () => {
    expect(FALLBACK_CHART_THEME.series).toEqual([
      resolve('--viz-1'),
      resolve('--viz-2'),
      resolve('--viz-3'),
      resolve('--viz-4'),
      resolve('--viz-5'),
      resolve('--viz-6'),
      resolve('--viz-7'),
      resolve('--viz-8'),
    ])

    expect(FALLBACK_CHART_THEME.grid).toBe(resolve('--viz-grid'))
    expect(FALLBACK_CHART_THEME.axis).toBe(resolve('--viz-axis'))
    expect(FALLBACK_CHART_THEME.track).toBe(resolve('--viz-track'))
    expect(FALLBACK_CHART_THEME.ink).toBe(resolve('--content-primary'))
    expect(FALLBACK_CHART_THEME.inkMuted).toBe(resolve('--content-secondary'))
    expect(FALLBACK_CHART_THEME.surface).toBe(resolve('--surface-base'))
    expect(FALLBACK_CHART_THEME.surfaceRaised).toBe(resolve('--surface-raised'))
    expect(FALLBACK_CHART_THEME.edge).toBe(resolve('--border-default'))

    for (const grade of ['a', 'b', 'c', 'd', 'e', 'unknown'] as const) {
      expect(FALLBACK_CHART_THEME.nutriScore[grade], `Nutri-Score ${grade}`).toBe(
        resolve(`--nutriscore-${grade}`),
      )
    }

    for (const group of [1, 2, 3, 4, 'unknown'] as const) {
      expect(FALLBACK_CHART_THEME.nova[group], `NOVA ${group}`).toBe(resolve(`--nova-${group}`))
    }
  })

  /**
   * The bug this whole conversion path exists for.
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
    const literals = [...ROOT.keys()]
      .filter((token) => /^--(viz|nova|nutriscore|primitive)-/.test(token))
      .map((token) => [token, resolve(token)] as const)

    expect(literals.length).toBeGreaterThan(20)

    for (const [token, value] of literals) {
      expect(value, `${token} is ${value}`).toMatch(/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i)
    }
  })
})
