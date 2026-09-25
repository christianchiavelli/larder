import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productQuerySchema } from '#shared/domain/search'

const $fetch = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', $fetch)

const { fetchProduct, fetchProducts, fetchSuggestions, productExportUrl } =
  await import('~/api/products')

beforeEach(() => {
  $fetch.mockClear()
})

function lastCall() {
  const call = $fetch.mock.calls.at(-1)
  if (!call) throw new Error('nothing was fetched')
  return { path: call[0] as string, options: call[1] as { query?: Record<string, unknown> } }
}

describe('fetchProducts', () => {
  it('sends the query in the same shape the URL uses', () => {
    const query = productQuerySchema.parse({
      q: 'cocoa',
      category: ['en:snacks'],
      nova: ['4'],
      page: '2',
    })

    fetchProducts(query)

    expect(lastCall().path).toBe('/api/products')
    expect(lastCall().options.query).toEqual({
      q: 'cocoa',
      category: ['en:snacks'],
      nova: ['4'],
      page: '2',
    })
  })

  it('omits everything at its default', () => {
    fetchProducts(productQuerySchema.parse({}))

    expect(lastCall().options.query).toEqual({})
  })
})

describe('productExportUrl', () => {
  it('carries the filters and the sort the directory is showing', () => {
    const url = productExportUrl(
      productQuerySchema.parse({
        q: 'cocoa spread',
        category: ['en:snacks', 'en:spreads'],
        nutriScore: 'not-applicable',
        sort: 'popularity',
      }),
    )

    const { pathname, searchParams } = new URL(url, 'http://larder.test')
    expect(pathname).toBe('/api/products.csv')
    expect(searchParams.get('q')).toBe('cocoa spread')
    expect(searchParams.getAll('category')).toEqual(['en:snacks', 'en:spreads'])
    expect(searchParams.getAll('nutriScore')).toEqual(['not-applicable'])
    expect(searchParams.get('sort')).toBe('popularity')
  })

  it('leaves the page behind, since an export starts from the first row', () => {
    const url = productExportUrl(productQuerySchema.parse({ page: '5', pageSize: '48', nova: '4' }))

    expect(url).toBe('/api/products.csv?nova=4')
  })

  it('is the bare path when nothing is filtered', () => {
    expect(productExportUrl(productQuerySchema.parse({}))).toBe('/api/products.csv')
  })

  it('encodes a term that would otherwise read as more parameters', () => {
    const url = productExportUrl(productQuerySchema.parse({ q: 'salt&vinegar=crisps' }))

    expect(new URL(url, 'http://larder.test').searchParams.get('q')).toBe('salt&vinegar=crisps')
  })
})

describe('fetchProduct', () => {
  it('addresses the product by barcode', () => {
    fetchProduct('3017620425035')

    expect(lastCall().path).toBe('/api/products/3017620425035')
  })

  it('encodes a code that would otherwise change the path', () => {
    fetchProduct('30176/20425035?x=1')

    expect(lastCall().path).toBe('/api/products/30176%2F20425035%3Fx%3D1')
  })
})

describe('fetchSuggestions', () => {
  it('defaults to categories and brands', () => {
    fetchSuggestions('choc')

    expect(lastCall().path).toBe('/api/suggest')
    expect(lastCall().options.query).toEqual({ q: 'choc', taxonomy: 'category,brand', limit: 8 })
  })

  it('passes an explicit taxonomy list and limit through', () => {
    fetchSuggestions('choc', ['brand'], 3)

    expect(lastCall().options.query).toEqual({ q: 'choc', taxonomy: 'brand', limit: 3 })
  })
})
