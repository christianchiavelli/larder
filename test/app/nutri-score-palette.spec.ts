import { describe, expect, it } from 'vitest'
import {
  NUTRI_SCORE_PALETTE_FALLBACK,
  NUTRI_SCORE_PALETTE_TOKENS,
} from '~/composables/use-nutri-score-palette'
import { NUTRI_SCORE_VALUES } from '#shared/domain/nutrition'
import { resolveToken } from '../support/css-tokens'

describe('the Nutri-Score palette', () => {
  it('covers every value the domain defines', () => {
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
    for (const [key, token] of Object.entries(NUTRI_SCORE_PALETTE_TOKENS)) {
      expect(() => resolveToken(`${token}-content`), key).not.toThrow()
    }
  })

  it('gives both ungraded states the same colour, on purpose', () => {
    expect(NUTRI_SCORE_PALETTE_TOKENS.unknown).toBe(NUTRI_SCORE_PALETTE_TOKENS['not-applicable'])
  })
})
