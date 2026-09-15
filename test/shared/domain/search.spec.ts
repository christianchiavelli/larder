import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  MAX_TRACKED_HITS,
  activeFilterCount,
  hasActiveFilters,
  maxPageFor,
  productQuerySchema,
  toQueryParams,
} from '#shared/domain/search'

/**
 * This schema parses the URL query string, so its inputs are whatever someone
 * can put in an address bar: repeated keys, missing keys, hand-edited values,
 * and values pasted from a link that a previous version of the app produced.
 *
 * The governing rule is that a malformed filter drops out and the page still
 * renders. Throwing would turn one stale bookmark into a broken page.
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

  /**
   * Round-tripping is the property that makes a URL the single source of
   * truth: what the app writes into the address bar has to parse back to the
   * state it came from, or a page reload silently changes the results.
   */
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
  /**
   * Normalised on the way in, so every source of a brand id agrees: the
   * suggestion that produced it, the link someone shared, and the URL a reader
   * edited by hand.
   */
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
    // A shared link can easily carry both, and requesting the same brand twice
    // would double-count it in the upstream query.
    expect(productQuerySchema.parse({ brand: ['en:olivari', 'olivari'] }).brand).toEqual([
      'olivari',
    ])
  })
})

describe('the Nutri-Score filter', () => {
  /**
   * The ungraded bucket is larger than every grade combined, and the schema
   * used to drop it as an invalid value. Dropping a filter does not narrow
   * anything, so the request came back as the entire unfiltered catalogue: the
   * checkbox read as applied and the results were of everything.
   */
  it.each(['a', 'b', 'c', 'd', 'e', 'unknown', 'not-applicable'])('accepts %s', (value) => {
    expect(productQuerySchema.parse({ nutriScore: value }).nutriScore).toEqual([value])
  })

  /**
   * The two absences are asked for separately, which is the point of splitting
   * them: a reader looking for products that ought to carry a grade wants the
   * ungraded ones without the beers and vinegars the scheme excludes.
   */
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
