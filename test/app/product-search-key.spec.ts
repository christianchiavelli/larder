import { describe, expect, it } from 'vitest'
import {
  productCountKey,
  productDetailQuery,
  productFacetKey,
  productSearchKey,
} from '~/composables/use-products'
import { productQuerySchema } from '#shared/domain/search'

const query = (input: Record<string, unknown>) => productQuerySchema.parse(input)

describe('productSearchKey', () => {
  it('is stable regardless of the order filters were selected in', () => {
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

describe('productCountKey', () => {
  it('changes with the filters', () => {
    expect(productCountKey(query({ brand: ['lu'] }))).not.toEqual(productCountKey(query({})))
  })

  it('stays put across sorts and pages, which do not change how many products match', () => {
    expect(productCountKey(query({ sort: 'popularity', page: '2', pageSize: '48' }))).toEqual(
      productCountKey(query({})),
    )
  })

  it('never collides with a search key for the same filters', () => {
    expect(productCountKey(query({}))[0]).not.toBe(productSearchKey(query({}))[0])
  })
})

describe('productFacetKey', () => {
  it('tells one dimension from another over the same search', () => {
    expect(productFacetKey('country', query({}))).not.toEqual(productFacetKey('brand', query({})))
  })

  it('follows the search it lists the values of', () => {
    expect(productFacetKey('country', query({ q: 'chocolate' }))).not.toEqual(
      productFacetKey('country', query({})),
    )
  })
})

describe('productDetailQuery', () => {
  it('keys a product by its barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(['product', '3017620425035'])
  })

  it('gives two callers the same key for the same product', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(productDetailQuery('3017620425035').key)
    expect(productDetailQuery('3017620425035').key).not.toEqual(
      productDetailQuery('3274080005003').key,
    )
  })
})
