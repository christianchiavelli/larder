import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productQuerySchema } from '#shared/domain/search'

/**
 * Stubbed before the module loads: `$fetch` is a Nuxt ambient global, so the
 * binding is resolved at import time.
 */
const $fetch = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', $fetch)

const { fetchProduct, fetchProducts, fetchSuggestions } = await import('~/api/products')

beforeEach(() => {
  $fetch.mockClear()
})

/** The path and options of the last call. */
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

    // The request and the address bar use one serialiser precisely so an
    // unfiltered search is one cache entry rather than several spellings of it.
    expect(lastCall().options.query).toEqual({})
  })
})

describe('fetchProduct', () => {
  it('addresses the product by barcode', () => {
    fetchProduct('3017620425035')

    expect(lastCall().path).toBe('/api/products/3017620425035')
  })

  it('encodes a code that would otherwise change the path', () => {
    // Barcodes come from user input and from upstream, and neither is a
    // guarantee. A slash would silently address a different route.
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
