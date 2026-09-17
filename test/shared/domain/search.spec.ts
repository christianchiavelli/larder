import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  FILTER_KEYS,
  MAX_TRACKED_HITS,
  activeFilterCount,
  catalogueSize,
  classifiedShare,
  clearedFilters,
  hasActiveFilters,
  gradedShare,
  maxPageFor,
  productQuerySchema,
  toQueryParams,
  type FilterKey,
  type NutriScoreDistribution,
} from '#shared/domain/search'

/**
 * The inputs are whatever someone can put in an address bar. A malformed filter
 * drops out and the page still renders.
 */
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

  /** What the app writes has to parse back, or a reload changes the results. */
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
  /** So a suggestion, a shared link and a hand-edited URL all agree. */
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
    // A shared link can carry both, and the upstream query would double-count.
    expect(productQuerySchema.parse({ brand: ['en:olivari', 'olivari'] }).brand).toEqual([
      'olivari',
    ])
  })
})

describe('the Nutri-Score filter', () => {
  /**
   * The schema used to drop these as invalid, and a dropped filter narrows
   * nothing: the control read as applied over the whole catalogue.
   */
  it.each(['a', 'b', 'c', 'd', 'e', 'unknown', 'not-applicable'])('accepts %s', (value) => {
    expect(productQuerySchema.parse({ nutriScore: value }).nutriScore).toEqual([value])
  })

  /** Separately, or a search for missing data comes back full of beers. */
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

/**
 * Four helpers used to enumerate the same seven names by hand, each with its own
 * passing spot check.
 */
describe('the filter dimensions', () => {
  /**
   * Typed on `FilterKey`, so a new dimension stops this compiling until someone
   * says what a set value looks like.
   */
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
  /** Groups reach a URL as numerals and the absence as a word, so no batch
   * coercion: `Number('none')` is NaN and the filter silently disappeared. */
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

/**
 * The headline figures, which are read off the facet buckets rather than the
 * hit count: Elasticsearch pins the count at its tracking ceiling but still
 * aggregates over every matching document.
 *
 * Shared by the front page and the overview. They were written out twice once,
 * and the copy that named its buckets went short by 71,025 products the day a
 * seventh value appeared.
 */
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

  /**
   * The regression that matters. Summing the five grades plus `unknown` is what
   * the overview used to do, and it reported a smaller catalogue than the chart
   * beside it without failing anywhere.
   */
  it('does not lose a bucket it was not told about', () => {
    const { 'not-applicable': excluded, ...withoutTheNewest } = catalogue
    expect(excluded).toBeGreaterThan(0)
    expect(catalogueSize(catalogue)).toBeGreaterThan(catalogueSize(withoutTheNewest)!)
  })

  it('reads an empty distribution as no answer rather than as an empty catalogue', () => {
    // A page that has not loaded yet renders an em-dash, never a zero.
    expect(catalogueSize({})).toBeNull()
    expect(gradedShare({})).toBeNull()
    expect(classifiedShare({}, 0)).toBeNull()
  })

  it('takes the graded share over the whole population, not over the graded part', () => {
    expect(gradedShare(catalogue)).toBe(50)
  })

  /**
   * The ungraded buckets are two thirds of the real catalogue, so excluding
   * them from the denominator would report a third of the products as most of
   * them.
   */
  it('counts the ungraded in the denominator', () => {
    expect(gradedShare({ a: 1, unknown: 3 })).toBe(25)
  })

  /** A count rather than a distribution: the facet has no bucket for it. */
  it('takes the classified share from the count the facet cannot report', () => {
    expect(classifiedShare(catalogue, 263)).toBeCloseTo(26.3, 5)
  })
})
