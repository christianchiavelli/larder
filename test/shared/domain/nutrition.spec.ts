import { describe, expect, it } from 'vitest'
import {
  NUTRI_SCORE_GRADES,
  NUTRI_SCORE_LABELS,
  NUTRI_SCORE_SHORT_LABELS,
  NUTRI_SCORE_VALUES,
  UNGRADED_REASONS,
  isUngraded,
  nutriScoreSchema,
} from '#shared/domain/nutrition'

/**
 * The Nutri-Score vocabulary.
 *
 * Worth asserting because it used to be smaller than the truth. Upstream
 * reports two reasons a product has no grade and the boundary flattened them
 * into one, so a catalogue in which two thirds of everything is ungraded could
 * not say how much of that was missing data and how much was a scheme that does
 * not apply.
 */

describe('the Nutri-Score vocabulary', () => {
  it('is the grades plus every reason a product has none', () => {
    expect(NUTRI_SCORE_VALUES).toEqual([...NUTRI_SCORE_GRADES, ...UNGRADED_REASONS])
  })

  it('parses every value it declares, and nothing else', () => {
    for (const value of NUTRI_SCORE_VALUES) {
      expect(nutriScoreSchema.parse(value)).toBe(value)
    }

    expect(nutriScoreSchema.safeParse('ungraded').success).toBe(false)
  })

  it('tells an absence from a grade', () => {
    expect(NUTRI_SCORE_GRADES.every((grade) => !isUngraded(grade))).toBe(true)
    expect(UNGRADED_REASONS.every((reason) => isUngraded(reason))).toBe(true)
  })

  /**
   * A value with no label renders as `undefined` in a badge and on a chart
   * axis, which is not a crash and not a failing build: it is a blank chip
   * nobody notices until a screenshot goes out.
   */
  it('labels every value, long and short', () => {
    for (const value of NUTRI_SCORE_VALUES) {
      expect(NUTRI_SCORE_LABELS[value], `long label for ${value}`).toBeTruthy()
      expect(NUTRI_SCORE_SHORT_LABELS[value], `short label for ${value}`).toBeTruthy()
    }
  })

  it('keeps the short labels distinct, since they are what the reader sees', () => {
    const short = NUTRI_SCORE_VALUES.map((value) => NUTRI_SCORE_SHORT_LABELS[value])
    expect(new Set(short).size).toBe(short.length)
  })
})
