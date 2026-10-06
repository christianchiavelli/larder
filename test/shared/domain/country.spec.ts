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

  it('names the country in Portuguese when asked', () => {
    expect(toCountryTag('en:france', 'FRA', 'pt')).toEqual({ id: 'en:france', label: 'França' })
  })

  it('falls back to the English name for a country without a Portuguese one', () => {
    expect(toCountryTag('en:northland-state', null, 'pt').label).toBe('Northland State')
  })

  it('falls back to what upstream sent when neither table knows the country', () => {
    expect(toCountryTag('en:atlantis', 'Atlântida', 'pt').label).toBe('Atlântida')
  })
})

describe('the country name table', () => {
  const english = Object.entries(COUNTRY_NAMES.en)
  const portuguese = Object.entries(COUNTRY_NAMES.pt)

  it('keys every name by the tag the search index uses', () => {
    expect(english.length).toBeGreaterThan(200)
    expect(english.every(([id]) => id.startsWith('en:'))).toBe(true)
  })

  it('holds a name for every tag', () => {
    expect(english.every(([, name]) => name.trim().length > 0)).toBe(true)
    expect(portuguese.every(([, name]) => name.trim().length > 0)).toBe(true)
  })

  it('names in Portuguese nearly every country it names in English, and nothing else', () => {
    expect(portuguese.length).toBeGreaterThan(english.length - 5)
    expect(portuguese.every(([id]) => id in COUNTRY_NAMES.en)).toBe(true)
  })

  it('never gives two countries the same Portuguese name', () => {
    const names = portuguese.map(([, name]) => name)
    expect(new Set(names).size).toBe(names.length)
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

  it.each([
    // Brazilian spelling, where the taxonomy's Portuguese is European ("Polónia").
    ['en:poland', 'Polônia'],
    // The taxonomy codes it UK; ISO and CLDR know it as GB.
    ['en:united-kingdom', 'Reino Unido'],
    // The taxonomy's "world" is not a region code; CLDR's 001 is.
    ['en:world', 'Mundo'],
    // CLDR would name the retired YU after Serbia.
    ['en:yugoslavia', 'Iugoslávia'],
    ['en:state-of-palestine', 'Palestina'],
    ['en:palestinian-territories', 'Territórios palestinos'],
    ['en:brazil', 'Brasil'],
  ])('names %s in Portuguese as %s', (id, name) => {
    expect(toCountryTag(id, null, 'pt').label).toBe(name)
  })
})
