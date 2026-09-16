import { describe, expect, it } from 'vitest'
import {
  NUTRI_SCORE_PALETTE_FALLBACK,
  NUTRI_SCORE_PALETTE_TOKENS,
} from '~/composables/use-nutri-score-palette'
import { NUTRI_SCORE_VALUES } from '#shared/domain/nutrition'
import { resolveToken } from '../support/css-tokens'

/**
 * These colours are prescribed by the scheme, so a value that drifts from the
 * token does not look slightly off, it misrepresents a regulated label.
 */

describe('the Nutri-Score palette', () => {
  it('covers every value the domain defines', () => {
    // Derived from the domain list rather than written out, so adding a value
    // upstream fails here instead of rendering the new one as transparent.
    expect(Object.keys(NUTRI_SCORE_PALETTE_FALLBACK).sort()).toEqual([...NUTRI_SCORE_VALUES].sort())
    expect(Object.keys(NUTRI_SCORE_PALETTE_TOKENS).sort()).toEqual([...NUTRI_SCORE_VALUES].sort())
  })

  it('matches the tokens it stands in for', () => {
    for (const [key, token] of Object.entries(NUTRI_SCORE_PALETTE_TOKENS)) {
      expect(
        NUTRI_SCORE_PALETTE_FALLBACK[key as keyof typeof NUTRI_SCORE_PALETTE_FALLBACK],
        key,
      ).toBe(resolveToken(token))
    }
  })

  it('ships an ink for every value', () => {
    // The badge draws text on each of these. A value whose ink is missing does
    // not fail, it inherits, and a regulated label becomes unreadable on one
    // colour in one theme.
    for (const [key, token] of Object.entries(NUTRI_SCORE_PALETTE_TOKENS)) {
      expect(() => resolveToken(`${token}-content`), key).not.toThrow()
    }
  })

  /**
   * The shared swatch is deliberate, so it is asserted rather than left looking
   * like an oversight.
   */
  it('gives both ungraded states the same colour, on purpose', () => {
    expect(NUTRI_SCORE_PALETTE_TOKENS.unknown).toBe(NUTRI_SCORE_PALETTE_TOKENS['not-applicable'])
  })
})
