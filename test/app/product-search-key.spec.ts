import { describe, expect, it } from 'vitest'
import { productDetailQuery, productSearchKey } from '~/composables/use-products'
import { productQuerySchema } from '#shared/domain/search'

/**
 * The cache key for a search.
 *
 * Worth its own file because both ways it can be wrong are invisible. Too
 * loose, and two different searches share an entry, so the directory shows
 * results for a filter the user has already changed. Too tight, and the same
 * search written two ways misses, which is precisely when a user is exploring
 * and toggling things on and off again.
 */

const query = (input: Record<string, unknown>) => productQuerySchema.parse(input)

describe('productSearchKey', () => {
  it('is stable regardless of the order filters were selected in', () => {
    // Selecting snacks then drinks is the same search as drinks then snacks,
    // and paying for it twice is a cache that misses while a user explores.
    expect(productSearchKey(query({ category: ['en:snacks', 'en:drinks'] }))).toEqual(
      productSearchKey(query({ category: ['en:drinks', 'en:snacks'] })),
    )
  })

  it.each([
    ['the search term', { q: 'cocoa' }],
    ['a category', { category: ['en:snacks'] }],
    ['a brand', { brand: ['lu'] }],
    ['a country', { country: ['en:france'] }],
    ['a label', { label: ['en:organic'] }],
    ['a Nutri-Score grade', { nutriScore: ['a'] }],
    ['a NOVA group', { nova: ['4'] }],
    ['the sort', { sort: 'popularity' }],
    ['the page', { page: '2' }],
    ['the page size', { pageSize: '48' }],
  ])('changes when %s changes', (_, patch) => {
    expect(productSearchKey(query(patch))).not.toEqual(productSearchKey(query({})))
  })

  it('does not confuse one dimension for another', () => {
    // The dimensions are joined into a flat list, so a key built without a
    // separator per dimension would make `brand=lu` and `label=lu` collide.
    expect(productSearchKey(query({ brand: ['lu'] }))).not.toEqual(
      productSearchKey(query({ label: ['lu'] })),
    )
  })

  it('is serialisable, because a cache key that holds objects compares by identity', () => {
    expect(() =>
      structuredClone(productSearchKey(query({ category: ['en:snacks'] }))),
    ).not.toThrow()
  })
})

describe('productDetailQuery', () => {
  it('keys a product by its barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(['product', '3017620425035'])
  })

  /**
   * Defined as options rather than as a composable so that the deep dive page
   * and a prefetch from a directory row share one cache entry. Two callers
   * building the key separately is how that silently becomes two entries and
   * two requests.
   */
  it('gives two callers the same key for the same product', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(productDetailQuery('3017620425035').key)
    expect(productDetailQuery('3017620425035').key).not.toEqual(
      productDetailQuery('3274080005003').key,
    )
  })
})
