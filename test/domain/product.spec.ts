import { describe, expect, it } from 'vitest'
import { normaliseBrands, productDisplayName } from '#shared/domain/product'
import {
  declaredNutrientCount,
  EMPTY_NUTRIENT_PROFILE,
  referenceIntakeShare,
} from '#shared/domain/nutrition'

describe('normaliseBrands', () => {
  it('splits the comma-joined string the v2 API returns', () => {
    expect(normaliseBrands('Nutella, FERRERO FRANCE COMMERCIALE')).toEqual([
      'Nutella',
      'FERRERO FRANCE COMMERCIALE',
    ])
  })

  it('accepts the array the search API returns for the same field', () => {
    expect(normaliseBrands(['Nutella'])).toEqual(['Nutella'])
  })

  it('collapses casing duplicates, keeping the first spelling seen', () => {
    expect(normaliseBrands('Nutella, NUTELLA, nutella')).toEqual(['Nutella'])
  })

  it('drops empty segments left by trailing or doubled commas', () => {
    expect(normaliseBrands('Lu,,  , Oreo,')).toEqual(['Lu', 'Oreo'])
  })

  it('returns an empty list for an absent value', () => {
    expect(normaliseBrands(null)).toEqual([])
    expect(normaliseBrands(undefined)).toEqual([])
    expect(normaliseBrands('')).toEqual([])
  })
})

describe('productDisplayName', () => {
  it('uses the name when there is one', () => {
    expect(productDisplayName({ code: '1', name: 'Nutella' })).toBe('Nutella')
  })

  it('falls back to the barcode rather than rendering an empty heading', () => {
    expect(productDisplayName({ code: '3017620425035', name: '' })).toBe(
      'Unnamed product 3017620425035',
    )
    expect(productDisplayName({ code: '3017620425035', name: '   ' })).toBe(
      'Unnamed product 3017620425035',
    )
  })
})

describe('declaredNutrientCount', () => {
  it('is zero when nothing is declared', () => {
    expect(declaredNutrientCount(EMPTY_NUTRIENT_PROFILE)).toBe(0)
  })

  it('counts a declared zero, which is a measurement and not an absence', () => {
    expect(declaredNutrientCount({ ...EMPTY_NUTRIENT_PROFILE, sugars: 0 })).toBe(1)
  })

  it('counts each declared nutrient', () => {
    expect(
      declaredNutrientCount({ ...EMPTY_NUTRIENT_PROFILE, sugars: 5, salt: 1.2, proteins: 8 }),
    ).toBe(3)
  })
})

describe('referenceIntakeShare', () => {
  it('expresses the value as a fraction of the adult reference intake', () => {
    // Salt reference is 6 g, so 3 g is half a day.
    expect(referenceIntakeShare('salt', 3)).toBeCloseTo(0.5)
  })

  it('returns null for a nutrient the regulation sets no reference for', () => {
    expect(referenceIntakeShare('fiber', 10)).toBeNull()
  })

  it('returns null when the nutrient is not declared', () => {
    expect(referenceIntakeShare('salt', null)).toBeNull()
  })

  it('does not clamp above one, because a portion can exceed a daily reference', () => {
    expect(referenceIntakeShare('salt', 12)).toBeCloseTo(2)
  })
})
