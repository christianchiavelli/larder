import { describe, expect, it } from 'vitest'
import { productQuerySchema } from '#shared/domain/search'
import { filterCacheKey } from '~~/server/utils/product-cache-key'

const query = (input: Record<string, unknown>) => productQuerySchema.parse(input)

describe('filterCacheKey', () => {
  it('is the same whatever order the filters were picked in', () => {
    expect(filterCacheKey(query({ category: ['en:snacks', 'en:drinks'] }))).toBe(
      filterCacheKey(query({ category: ['en:drinks', 'en:snacks'] })),
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
  ])('changes when %s changes', (_, patch) => {
    expect(filterCacheKey(query(patch))).not.toBe(filterCacheKey(query({})))
  })

  it('ignores the sort and the page, which change the rows but not which products match', () => {
    expect(filterCacheKey(query({ sort: 'popularity', page: '3', pageSize: '48' }))).toBe(
      filterCacheKey(query({})),
    )
  })

  it('does not confuse one dimension for another', () => {
    expect(filterCacheKey(query({ brand: ['lu'] }))).not.toBe(
      filterCacheKey(query({ label: ['lu'] })),
    )
  })

  it('keeps only characters that are safe in a storage key', () => {
    expect(filterCacheKey(query({ q: 'salt & vinegar/crisps', category: ['en:snacks'] }))).toMatch(
      /^[a-zA-Z0-9_|.-]+$/,
    )
  })
})
