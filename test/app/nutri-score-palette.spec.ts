import { describe, expect, it } from 'vitest'
import { NUTRI_SCORE_PALETTE_FALLBACK } from '~/composables/use-nutri-score-palette'
import { NUTRI_SCORE_GRADES } from '#shared/domain/nutrition'
import { resolveToken } from '../support/css-tokens'

/**
 * The Nutri-Score palette, and the copy of it shipped for the first paint.
 *
 * Same drift risk as the chart theme's fallback, and one more reason to assert
 * it here: these are not decorative colours. They are set by the scheme's own
 * guidelines, so a value that quietly diverges from the token does not look
 * slightly off, it misrepresents a regulated label.
 */

describe('the Nutri-Score palette', () => {
  it('covers every grade the domain defines, plus the absent state', () => {
    // Derived from the domain list rather than written out, so adding a grade
    // upstream fails here instead of rendering the new one as transparent.
    expect(Object.keys(NUTRI_SCORE_PALETTE_FALLBACK).sort()).toEqual(
      [...NUTRI_SCORE_GRADES, 'unknown'].sort(),
    )
  })

  it('matches the tokens it stands in for', () => {
    for (const [key, value] of Object.entries(NUTRI_SCORE_PALETTE_FALLBACK)) {
      expect(value, `Nutri-Score ${key}`).toBe(resolveToken(`--nutriscore-${key}`))
    }
  })

  it('ships an ink for every grade', () => {
    // The badge draws text on each of these. A grade whose ink is missing does
    // not fail, it inherits, and a regulated label becomes unreadable on one
    // colour in one theme.
    for (const key of Object.keys(NUTRI_SCORE_PALETTE_FALLBACK)) {
      expect(() => resolveToken(`--nutriscore-${key}-content`), key).not.toThrow()
    }
  })
})
