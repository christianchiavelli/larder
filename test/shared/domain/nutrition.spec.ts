import { describe, expect, it } from 'vitest'
import {
  NUTRI_SCORE_GRADES,
  NUTRI_SCORE_VALUES,
  UNGRADED_REASONS,
  isUngraded,
  nutriScoreSchema,
} from '#shared/domain/nutrition'

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
})
