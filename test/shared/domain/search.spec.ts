import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  FACET_FIELDS,
  FACET_FIELD_OF,
  FILTER_KEYS,
  MAX_TRACKED_HITS,
  TAG_DIMENSIONS,
  activeFilterCount,
  catalogueSize,
  classifiedShare,
  clearedFilters,
  hasActiveFilters,
  gradedShare,
  isTagDimension,
  maxPageFor,
  productQuerySchema,
  toQueryParams,
  withoutDimension,
  type FilterKey,
  type NutriScoreDistribution,
} from '#shared/domain/search'

describe('productQuerySchema', () => {
  it('fills in defaults for an empty query string', () => {
    expect(productQuerySchema.parse({})).toEqual({
      q: '',
      category: [],
      brand: [],
      country: [],
      label: [],
      nutriScore: [],
      nova: [],
      sort: 'relevance',
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('reads a single occurrence of a repeatable key as a one-item list', () => {
    expect(productQuerySchema.parse({ brand: 'lu' }).brand).toEqual(['lu'])
  })

  it('reads repeated keys as a list', () => {
    expect(productQuerySchema.parse({ brand: ['lu', 'oreo'] }).brand).toEqual(['lu', 'oreo'])
  })

  it('deduplicates a value repeated in a shared URL', () => {
    expect(productQuerySchema.parse({ brand: ['lu', 'lu'] }).brand).toEqual(['lu'])
  })

  it('trims surrounding whitespace from free text', () => {
    expect(productQuerySchema.parse({ q: '  granola  ' }).q).toBe('granola')
  })

  it('drops an invalid Nutri-Score rather than rejecting the whole query', () => {
    expect(productQuerySchema.parse({ nutriScore: ['a', 'z', 'b'] }).nutriScore).toEqual(['a', 'b'])
  })

  it('coerces NOVA groups from strings and drops out-of-range values', () => {
    expect(productQuerySchema.parse({ nova: ['1', '4', '9'] }).nova).toEqual([1, 4])
  })

  it('falls back to relevance for an unknown sort', () => {
    expect(productQuerySchema.parse({ sort: 'by-vibes' }).sort).toBe('relevance')
  })

  it('falls back to the default for a page size that is not offered', () => {
    expect(productQuerySchema.parse({ pageSize: '7' }).pageSize).toBe(DEFAULT_PAGE_SIZE)
  })

  it('accepts an offered page size', () => {
    expect(productQuerySchema.parse({ pageSize: '96' }).pageSize).toBe(96)
  })

  it.each([['0'], ['-3'], ['not a number']])('falls back to page 1 for %s', (page) => {
    expect(productQuerySchema.parse({ page }).page).toBe(1)
  })

  it('caps free text length rather than forwarding an unbounded string upstream', () => {
    const parsed = productQuerySchema.parse({ q: 'x'.repeat(500) })
    expect(parsed.q.length).toBeLessThanOrEqual(120)
  })

  it('caps the number of values in one dimension', () => {
    const parsed = productQuerySchema.safeParse({
      brand: Array.from({ length: 50 }, (_, index) => `brand-${index}`),
    })
    expect(parsed.success).toBe(false)
  })
})

describe('maxPageFor', () => {
  it('derives the ceiling from the tracked-hit limit', () => {
    expect(maxPageFor(24)).toBe(Math.floor(MAX_TRACKED_HITS / 24))
    expect(maxPageFor(96)).toBe(Math.floor(MAX_TRACKED_HITS / 96))
  })

  it('never returns a page below the first one', () => {
    expect(maxPageFor(999_999)).toBe(1)
  })
})

describe('hasActiveFilters', () => {
  it('is false for a bare query', () => {
    expect(hasActiveFilters(productQuerySchema.parse({}))).toBe(false)
  })

  it('ignores pagination and sort, which are not filters', () => {
    expect(hasActiveFilters(productQuerySchema.parse({ page: '3', sort: 'popularity' }))).toBe(
      false,
    )
  })

  it('is true once any dimension is set', () => {
    expect(hasActiveFilters(productQuerySchema.parse({ nova: '4' }))).toBe(true)
  })
})

describe('activeFilterCount', () => {
  it('counts free text as one filter', () => {
    expect(activeFilterCount(productQuerySchema.parse({ q: 'granola' }))).toBe(1)
  })

  it('counts each value across every dimension', () => {
    const query = productQuerySchema.parse({
      q: 'granola',
      brand: ['lu', 'oreo'],
      nutriScore: ['a'],
    })

    expect(activeFilterCount(query)).toBe(4)
  })
})

describe('toQueryParams', () => {
  it('omits everything at its default so a shared link carries only real state', () => {
    expect(toQueryParams(productQuerySchema.parse({}))).toEqual({})
  })

  it('omits page 1 and the default page size', () => {
    const params = toQueryParams(productQuerySchema.parse({ page: '1', pageSize: '24', q: 'x' }))

    expect(params).toEqual({ q: 'x' })
  })

  it('keeps non-default pagination', () => {
    const params = toQueryParams(productQuerySchema.parse({ page: '3', pageSize: '96' }))

    expect(params).toEqual({ page: '3', pageSize: '96' })
  })

  it('serialises NOVA groups as strings, since a URL has no numbers', () => {
    expect(toQueryParams(productQuerySchema.parse({ nova: ['1', '4'] })).nova).toEqual(['1', '4'])
  })

  it('round-trips through the schema unchanged', () => {
    const original = productQuerySchema.parse({
      q: 'dark chocolate',
      category: ['en:biscuits'],
      brand: ['lu', 'oreo'],
      nutriScore: ['a', 'b'],
      nova: ['4'],
      sort: 'popularity',
      page: '3',
      pageSize: '48',
    })

    expect(productQuerySchema.parse(toQueryParams(original))).toEqual(original)
  })
})

describe('the brand filter', () => {
  it('accepts a prefixed brand id and stores the bare slug', () => {
    expect(productQuerySchema.parse({ brand: 'en:olivari' }).brand).toEqual(['olivari'])
  })

  it('leaves the form the facet returns untouched', () => {
    expect(productQuerySchema.parse({ brand: 'carrefour' }).brand).toEqual(['carrefour'])
  })

  it('does not normalise the other dimensions', () => {
    const query = productQuerySchema.parse({ category: 'en:snacks', label: 'en:organic' })

    expect(query.category).toEqual(['en:snacks'])
    expect(query.label).toEqual(['en:organic'])
  })

  it('collapses the two spellings of one brand into a single filter', () => {
    expect(productQuerySchema.parse({ brand: ['en:olivari', 'olivari'] }).brand).toEqual([
      'olivari',
    ])
  })
})

describe('the Nutri-Score filter', () => {
  it.each(['a', 'b', 'c', 'd', 'e', 'unknown', 'not-applicable'])('accepts %s', (value) => {
    expect(productQuerySchema.parse({ nutriScore: value }).nutriScore).toEqual([value])
  })

  it('takes the two absences independently', () => {
    expect(productQuerySchema.parse({ nutriScore: ['unknown'] }).nutriScore).toEqual(['unknown'])
    expect(productQuerySchema.parse({ nutriScore: ['not-applicable'] }).nutriScore).toEqual([
      'not-applicable',
    ])
    expect(
      productQuerySchema.parse({ nutriScore: ['unknown', 'not-applicable'] }).nutriScore,
    ).toEqual(['unknown', 'not-applicable'])
  })

  it('still drops a value that is neither', () => {
    expect(productQuerySchema.parse({ nutriScore: 'z' }).nutriScore).toEqual([])
  })
})

describe('the filter dimensions', () => {
  const EVERY_DIMENSION: Record<FilterKey, unknown> = {
    q: 'granola',
    category: ['en:snacks'],
    brand: ['lu'],
    country: ['en:france'],
    label: ['en:organic'],
    nutriScore: ['a'],
    nova: ['4'],
  }

  it('are exactly what the schema declares, minus how the list is read', () => {
    expect(Object.keys(EVERY_DIMENSION).sort()).toEqual([...FILTER_KEYS].sort())
    expect(FILTER_KEYS).not.toContain('sort')
    expect(FILTER_KEYS).not.toContain('page')
    expect(FILTER_KEYS).not.toContain('pageSize')
  })

  it('are each counted once when each carries a value', () => {
    const query = productQuerySchema.parse(EVERY_DIMENSION)

    expect(hasActiveFilters(query)).toBe(true)
    expect(activeFilterCount(query)).toBe(FILTER_KEYS.length)
  })

  it('each reach the URL', () => {
    const params = toQueryParams(productQuerySchema.parse(EVERY_DIMENSION))

    expect(Object.keys(params).sort()).toEqual([...FILTER_KEYS].sort())
  })

  it('are all switched off together, and nothing else is', () => {
    const cleared = productQuerySchema.parse({
      ...EVERY_DIMENSION,
      sort: 'popularity',
      pageSize: '48',
      ...clearedFilters(),
    })

    expect(hasActiveFilters(cleared)).toBe(false)
    expect(activeFilterCount(cleared)).toBe(0)
    expect(toQueryParams(cleared)).toEqual({ sort: 'popularity', pageSize: '48' })
  })
})

describe('the NOVA filter', () => {
  it.each(['1', '2', '3', '4'])('accepts group %s as the number it is', (group) => {
    expect(productQuerySchema.parse({ nova: group }).nova).toEqual([Number(group)])
  })

  it('accepts the absence as itself', () => {
    expect(productQuerySchema.parse({ nova: 'none' }).nova).toEqual(['none'])
  })

  it('keeps a group and the absence side by side', () => {
    expect(productQuerySchema.parse({ nova: ['2', 'none'] }).nova).toEqual([2, 'none'])
  })

  it.each(['0', '5', 'banana', ''])('still drops %s', (value) => {
    expect(productQuerySchema.parse({ nova: value }).nova).toEqual([])
  })

  it('survives a round trip through the URL', () => {
    const query = productQuerySchema.parse({ nova: ['2', 'none'] })
    expect(productQuerySchema.parse(toQueryParams(query)).nova).toEqual([2, 'none'])
  })
})

describe('the catalogue figures', () => {
  const catalogue: NutriScoreDistribution = {
    a: 100,
    b: 100,
    c: 100,
    d: 100,
    e: 100,
    unknown: 400,
    'not-applicable': 100,
  }

  it('counts every bucket, including ones added after it was written', () => {
    expect(catalogueSize(catalogue)).toBe(1000)
  })

  it('does not lose a bucket it was not told about', () => {
    const { 'not-applicable': excluded, ...withoutTheNewest } = catalogue
    expect(excluded).toBeGreaterThan(0)
    expect(catalogueSize(catalogue)).toBeGreaterThan(catalogueSize(withoutTheNewest)!)
  })

  it('reads an empty distribution as no answer rather than as an empty catalogue', () => {
    expect(catalogueSize({})).toBeNull()
    expect(gradedShare({})).toBeNull()
    expect(classifiedShare({}, 0)).toBeNull()
  })

  it('takes the graded share over the whole population, not over the graded part', () => {
    expect(gradedShare(catalogue)).toBe(50)
  })

  it('counts the ungraded in the denominator', () => {
    expect(gradedShare({ a: 1, unknown: 3 })).toBe(25)
  })

  it('takes the classified share from the count the facet cannot report', () => {
    expect(classifiedShare(catalogue, 263)).toBeCloseTo(26.3, 5)
  })
})

describe('the tag dimensions', () => {
  it('each read from one of the facets the search asks for', () => {
    expect(TAG_DIMENSIONS.map((dimension) => FACET_FIELD_OF[dimension]).sort()).toEqual(
      [...FACET_FIELDS].sort(),
    )
  })

  it.each([
    ['category', true],
    ['label', true],
    ['nutriScore', false],
    ['', false],
    [undefined, false],
  ])('knows %o is a tag dimension: %s', (value, expected) => {
    expect(isTagDimension(value)).toBe(expected)
  })

  it('drops one dimension and keeps every other filter', () => {
    const query = productQuerySchema.parse({
      q: 'chocolate',
      country: ['en:brazil', 'en:canada'],
      brand: ['lindt'],
      nutriScore: ['a'],
    })

    expect(withoutDimension(query, 'country')).toEqual({ ...query, country: [] })
  })

  it('leaves the query it was given alone', () => {
    const query = productQuerySchema.parse({ country: ['en:brazil'] })

    withoutDimension(query, 'country')

    expect(query.country).toEqual(['en:brazil'])
  })
})
