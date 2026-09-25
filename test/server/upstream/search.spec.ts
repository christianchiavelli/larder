import { describe, expect, it } from 'vitest'
import {
  mapFacet,
  mapNovaGroup,
  mapNutriScore,
  mapNutriments,
  mapSearchHits,
} from '~~/server/upstream/search'
import { EMPTY_NUTRIENT_PROFILE } from '#shared/domain/nutrition'

const MINIMAL_HIT = {
  code: '7797599000049',
  brands: ['Granola'],
  nutriments: {
    'energy-kcal_100g': 390,
    'saturated-fat_100g': 3.3333333333333335,
    carbohydrates_100g: 66.66666666666667,
    fat_100g: 9.00000015894572,
    proteins_100g: 10,
    fiber_100g: 5.999999841054281,
  },
  nutriscore_grade: 'unknown',
  product_name: 'Granola',
  product_name_en: 'Granola',
}

const RICH_HIT = {
  code: '3017620425035',
  product_name: 'Nutella',
  product_name_en: 'Nutella',
  brands: ['Nutella', 'FERRERO FRANCE COMMERCIALE'],
  categories_tags: ['en:breakfasts', 'en:spreads', 'en:sweet-spreads'],
  nutriscore_grade: 'e',
  nova_groups: '4',
  image_front_thumb_url: 'https://images.openfoodfacts.org/images/products/front_en.100.jpg',
  image_front_small_url: 'https://images.openfoodfacts.org/images/products/front_en.200.jpg',
  image_front_url: 'https://images.openfoodfacts.org/images/products/front_en.400.jpg',
  nutriments: {
    'energy-kcal_100g': 539,
    fat_100g: 30.9,
    'saturated-fat_100g': 10.6,
    carbohydrates_100g: 57.5,
    sugars_100g: 56.3,
    proteins_100g: 6.3,
    salt_100g: 0.107,
    sodium_100g: 0.0428,
  },
}

describe('mapSearchHits', () => {
  it('maps a hit that omits every optional field', () => {
    const { items, rejected } = mapSearchHits([MINIMAL_HIT])

    expect(rejected).toBe(0)
    expect(items).toHaveLength(1)

    const [product] = items
    expect(product!.code).toBe('7797599000049')
    expect(product!.name).toBe('Granola')
    expect(product!.categories).toEqual([])
    expect(product!.novaGroup).toBeNull()
    expect(product!.image).toBeNull()
    expect(product!.nutriScore).toBe('unknown')
  })

  it('maps a fully populated hit', () => {
    const { items } = mapSearchHits([RICH_HIT])
    const [product] = items

    expect(product!.brands).toEqual(['Nutella', 'FERRERO FRANCE COMMERCIALE'])
    expect(product!.categories.at(-1)).toEqual({ id: 'en:sweet-spreads', label: 'Sweet spreads' })
    expect(product!.nutriScore).toBe('e')
    expect(product!.novaGroup).toBe(4)
    expect(product!.nutrients.sugars).toBe(56.3)
  })

  it('carries the front image at each published width', () => {
    const { items } = mapSearchHits([RICH_HIT])

    expect(items[0]!.image).toEqual({
      thumb: expect.stringContaining('.100.jpg'),
      small: expect.stringContaining('.200.jpg'),
      large: expect.stringContaining('.400.jpg'),
    })
  })

  it('falls back per width rather than per product', () => {
    const { items } = mapSearchHits([
      {
        ...RICH_HIT,
        image_front_small_url: null,
        image_small_url: 'https://images.example/any.200.jpg',
      },
    ])

    expect(items[0]!.image?.small).toBe('https://images.example/any.200.jpg')
    expect(items[0]!.image?.thumb).toContain('.100.jpg')
  })

  it('drops only the malformed record, keeping the rest of the page', () => {
    const { items, rejected } = mapSearchHits([RICH_HIT, { no_code: true }, MINIMAL_HIT])

    expect(rejected).toBe(1)
    expect(items).toHaveLength(2)
  })

  it('returns an empty result rather than throwing on an empty page', () => {
    expect(mapSearchHits([])).toEqual({ items: [], rejected: 0 })
  })
})

describe('mapNutriments', () => {
  it('reads only the per-100g variant', () => {
    const profile = mapNutriments({
      salt_100g: 1.2,
      salt_value: 99,
      salt: 99,
    })

    expect(profile.salt).toBe(1.2)
  })

  it('treats a missing nutrient as null, never as zero', () => {
    const profile = mapNutriments(MINIMAL_HIT.nutriments)

    expect(profile.salt).toBeNull()
    expect(profile.sugars).toBeNull()
    expect(profile.proteins).toBe(10)
  })

  it('rejects negative masses, which are data-entry errors', () => {
    expect(mapNutriments({ sugars_100g: -5 }).sugars).toBeNull()
  })

  it('rejects non-finite values', () => {
    expect(mapNutriments({ fat_100g: 'not a number' }).fat).toBeNull()
  })

  it('accepts a numeric string, which upstream mixes in freely', () => {
    expect(mapNutriments({ fat_100g: '12.5' }).fat).toBe(12.5)
  })

  it('returns an all-null profile when the bag is absent', () => {
    expect(mapNutriments(null)).toEqual(EMPTY_NUTRIENT_PROFILE)
    expect(mapNutriments(undefined)).toEqual(EMPTY_NUTRIENT_PROFILE)
  })

  it('gives back the figure that was typed, not the 32-bit float it was stored as', () => {
    const profile = mapNutriments({
      fat_100g: 0.20000000298023,
      carbohydrates_100g: 78.099998474121,
      sodium_100g: 0.047999998927116,
    })

    expect(profile.fat).toBe(0.2)
    expect(profile.carbohydrates).toBe(78.1)
    expect(profile.sodium).toBe(0.048)
  })

  it('drops the noise of arithmetic done upstream, such as salt derived from sodium', () => {
    expect(mapNutriments({ salt_100g: 0.607999999999999 }).salt).toBe(0.608)
  })

  it('keeps every digit a label could plausibly carry', () => {
    const profile = mapNutriments({ 'energy-kcal_100g': 2345.5, sodium_100g: 0.00123 })

    expect(profile.energyKcal).toBe(2345.5)
    expect(profile.sodium).toBe(0.00123)
  })
})

describe('mapNutriScore', () => {
  it.each([
    ['a', 'a'],
    ['E', 'e'],
    ['unknown', 'unknown'],
    ['', 'unknown'],
  ])('maps %s to %s', (input, expected) => {
    expect(mapNutriScore(input)).toBe(expected)
  })

  it('maps a missing grade to unknown', () => {
    expect(mapNutriScore(null)).toBe('unknown')
  })

  it('keeps not-applicable apart from a grade nobody has entered', () => {
    expect(mapNutriScore('not-applicable')).toBe('not-applicable')
  })

  it('reads an unrecognised value as ungraded rather than excluded', () => {
    expect(mapNutriScore('not-computed')).toBe('unknown')
  })
})

describe('mapNovaGroup', () => {
  it('reads the numeric-string spelling', () => {
    expect(mapNovaGroup({ nova_group: null, nova_groups: 3 })).toBe(3)
  })

  it('prefers nova_group when both are present and disagree', () => {
    expect(mapNovaGroup({ nova_group: 4, nova_groups: 3 })).toBe(4)
  })

  it('rejects a value outside the 1..4 scale', () => {
    expect(mapNovaGroup({ nova_group: 7, nova_groups: null })).toBeNull()
  })

  it('maps an absent group to null rather than defaulting it', () => {
    expect(mapNovaGroup({ nova_group: null, nova_groups: null })).toBeNull()
  })
})

describe('mapFacet', () => {
  it('humanises a bare slug key, as brands_tags returns', () => {
    expect(mapFacet([{ key: 'lu', name: 'lu', count: 265 }])).toEqual([
      { key: 'lu', label: 'Lu', count: 265 },
    ])
  })

  it('keeps the language prefix in the key and strips it from the label', () => {
    const [facet] = mapFacet([{ key: 'en:sweet-spreads', name: null, count: 12 }])

    expect(facet!.key).toBe('en:sweet-spreads')
    expect(facet!.label).toBe('Sweet spreads')
  })

  it('drops the unknown bucket, which is not a filterable value', () => {
    const facets = mapFacet([
      { key: 'unknown', name: 'unknown', count: 4832 },
      { key: 'lu', name: 'lu', count: 265 },
    ])

    expect(facets.map((facet) => facet.key)).toEqual(['lu'])
  })

  it('drops the --other-- remainder bucket', () => {
    const facets = mapFacet([
      { key: '--other--', name: 'Other', count: 6_127_608 },
      { key: 'en:snacks', name: 'Snacks', count: 290_398 },
    ])

    expect(facets.map((facet) => facet.key)).toEqual(['en:snacks'])
  })

  it('drops the not-applicable bucket', () => {
    expect(mapFacet([{ key: 'not-applicable', name: 'not-applicable', count: 12 }])).toEqual([])
  })

  it('keeps a real value whose label happens to read like a sentinel', () => {
    const facets = mapFacet([{ key: 'en:other-vegetables', name: 'Other vegetables', count: 40 }])

    expect(facets).toHaveLength(1)
  })
})
