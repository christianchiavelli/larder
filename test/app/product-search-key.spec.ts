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
    expect(productSearchKey(query({ category: ['en:snacks', 'en:drinks'] }), 'en')).toEqual(
      productSearchKey(query({ category: ['en:drinks', 'en:snacks'] }), 'en'),
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
    expect(productSearchKey(query(patch), 'en')).not.toEqual(productSearchKey(query({}), 'en'))
  })

  it('keeps one language apart from another', () => {
    expect(productSearchKey(query({}), 'pt')).not.toEqual(productSearchKey(query({}), 'en'))
  })

  it('does not confuse one dimension for another', () => {
    expect(productSearchKey(query({ brand: ['lu'] }), 'en')).not.toEqual(
      productSearchKey(query({ label: ['lu'] }), 'en'),
    )
  })

  it('is serialisable, because a cache key that holds objects compares by identity', () => {
    expect(() =>
      structuredClone(productSearchKey(query({ category: ['en:snacks'] }), 'en')),
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
    expect(productCountKey(query({}))[0]).not.toBe(productSearchKey(query({}), 'en')[0])
  })
})

describe('productFacetKey', () => {
  it('tells one dimension from another over the same search', () => {
    expect(productFacetKey('country', query({}), 'en')).not.toEqual(
      productFacetKey('brand', query({}), 'en'),
    )
  })

  it('keeps one language apart from another, since country names differ', () => {
    expect(productFacetKey('country', query({}), 'pt')).not.toEqual(
      productFacetKey('country', query({}), 'en'),
    )
  })

  it('follows the search it lists the values of', () => {
    expect(productFacetKey('country', query({ q: 'chocolate' }), 'en')).not.toEqual(
      productFacetKey('country', query({}), 'en'),
    )
  })
})

describe('productDetailQuery', () => {
  it('keys a product by its language and barcode', () => {
    expect(productDetailQuery({ code: '3017620425035', language: 'en' }).key).toEqual([
      'product',
      'en',
      '3017620425035',
    ])
  })

  it('gives two callers the same key for the same product', () => {
    const nutella = { code: '3017620425035', language: 'en' } as const
    expect(productDetailQuery(nutella).key).toEqual(productDetailQuery({ ...nutella }).key)
    expect(productDetailQuery(nutella).key).not.toEqual(
      productDetailQuery({ ...nutella, code: '3274080005003' }).key,
    )
  })

  it('keeps one language apart from another, since the names differ', () => {
    expect(productDetailQuery({ code: '3017620425035', language: 'en' }).key).not.toEqual(
      productDetailQuery({ code: '3017620425035', language: 'pt' }).key,
    )
  })
})
