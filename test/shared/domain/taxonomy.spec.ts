import { describe, expect, it } from 'vitest'
import {
  toFilterValue,
  humanizeTagId,
  mostSpecificTag,
  parseTagId,
  toTaxonomyTag,
} from '#shared/domain/taxonomy'

describe('parseTagId', () => {
  it('splits a language-prefixed id', () => {
    expect(parseTagId('en:sweet-spreads')).toEqual({ lang: 'en', slug: 'sweet-spreads' })
  })

  it('treats an unprefixed value as a bare slug, which is how brand facets arrive', () => {
    expect(parseTagId('lu')).toEqual({ lang: null, slug: 'lu' })
  })

  it('keeps a colon that appears inside the slug', () => {
    expect(parseTagId('en:a:b')).toEqual({ lang: 'en', slug: 'a:b' })
  })
})

describe('humanizeTagId', () => {
  it('drops the language prefix and sentence-cases the slug', () => {
    expect(humanizeTagId('en:sweet-spreads')).toBe('Sweet spreads')
  })

  it('does not title-case every word, which would misspell most category names', () => {
    expect(humanizeTagId('en:breakfast-cereals-and-bars')).toBe('Breakfast cereals and bars')
  })

  it.each([
    ['en:pdo', 'PDO'],
    ['en:igp', 'IGP'],
    ['en:msc', 'MSC'],
    ['en:eu-organic', 'EU organic'],
  ])('preserves the known casing of %s', (id, expected) => {
    expect(humanizeTagId(id)).toBe(expected)
  })

  it('returns the id unchanged when there is nothing to humanise', () => {
    expect(humanizeTagId('en:')).toBe('en:')
  })
})

describe('toTaxonomyTag', () => {
  it('prefers a real label from upstream', () => {
    expect(toTaxonomyTag('en:sweet-spreads', 'Pâtes à tartiner')).toEqual({
      id: 'en:sweet-spreads',
      label: 'Pâtes à tartiner',
    })
  })

  it('ignores a label that merely echoes the slug', () => {
    expect(toTaxonomyTag('lu', 'lu').label).toBe('Lu')
  })

  it('ignores an echoed label even when spaced differently', () => {
    expect(toTaxonomyTag('en:sweet-spreads', 'sweet spreads').label).toBe('Sweet spreads')
  })

  it('falls back to the id when the label is empty or whitespace', () => {
    expect(toTaxonomyTag('en:biscuits', '   ').label).toBe('Biscuits')
    expect(toTaxonomyTag('en:biscuits', null).label).toBe('Biscuits')
    expect(toTaxonomyTag('en:biscuits').label).toBe('Biscuits')
  })

  it('never alters the id, which is the filter value', () => {
    expect(toTaxonomyTag('en:sweet-spreads', 'Anything').id).toBe('en:sweet-spreads')
  })
})

describe('mostSpecificTag', () => {
  it('returns the last entry, since upstream orders broadest first', () => {
    const tags = [
      { id: 'en:breakfasts', label: 'Breakfasts' },
      { id: 'en:spreads', label: 'Spreads' },
      { id: 'en:sweet-spreads', label: 'Sweet spreads' },
    ]

    expect(mostSpecificTag(tags)?.id).toBe('en:sweet-spreads')
  })

  it('returns null for a product with no categories', () => {
    expect(mostSpecificTag([])).toBeNull()
  })
})

describe('toFilterValue', () => {
  it('strips the language prefix from a brand', () => {
    expect(toFilterValue('brand', 'en:olivari')).toBe('olivari')
  })

  it('leaves a brand that is already bare alone', () => {
    expect(toFilterValue('brand', 'carrefour')).toBe('carrefour')
  })

  it.each(['category', 'country', 'label', 'additive'] as const)(
    'keeps the prefix on a %s',
    (taxonomy) => {
      expect(toFilterValue(taxonomy, 'en:organic')).toBe('en:organic')
    },
  )
})
