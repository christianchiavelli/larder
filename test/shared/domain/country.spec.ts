import { describe, expect, it } from 'vitest'
import { toCountryTag } from '#shared/domain/country'
import COUNTRY_NAMES from '#shared/domain/country-names.json'

describe('toCountryTag', () => {
  it('prefers the name in the country taxonomy over the one upstream sent', () => {
    expect(toCountryTag('en:france', 'FRA')).toEqual({ id: 'en:france', label: 'France' })
  })

  it('falls back to what upstream sent for a country the table does not know yet', () => {
    expect(toCountryTag('en:atlantis', 'Atlantis').label).toBe('Atlantis')
  })

  it('derives a name from the id when neither the table nor upstream has one', () => {
    expect(toCountryTag('en:atlantis').label).toBe('Atlantis')
  })

  it('sentence-cases a table name that arrives in lower case', () => {
    expect(toCountryTag('en:world').label).toBe('World')
  })
})

describe('the country name table', () => {
  const entries = Object.entries(COUNTRY_NAMES)

  it('keys every name by the tag the search index uses', () => {
    expect(entries.length).toBeGreaterThan(200)
    expect(entries.every(([id]) => id.startsWith('en:'))).toBe(true)
  })

  it('holds a name for every tag', () => {
    expect(entries.every(([, name]) => name.trim().length > 0)).toBe(true)
  })

  it.each([
    ['en:france', 'France'],
    ['en:united-states', 'United States'],
    ['en:united-kingdom', 'United Kingdom'],
    ['en:switzerland', 'Switzerland'],
    ['en:canada', 'Canada'],
    ['en:belgium', 'Belgium'],
    ['en:spain', 'Spain'],
  ])('names %s as %s, where the facet says something else', (id, name) => {
    expect(toCountryTag(id).label).toBe(name)
  })
})
