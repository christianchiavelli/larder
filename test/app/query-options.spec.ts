import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { productQuerySchema } from '#shared/domain/search'

const useQuery = vi.fn()
vi.mock('@pinia/colada', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pinia/colada')>()),
  useQuery: (options: unknown) => useQuery(options),
}))

const $fetch = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', $fetch)

const {
  productCountKey,
  productDetailQuery,
  productFacetKey,
  productSearchKey,
  useProductCount,
  useProductFacet,
  useProductSearch,
} = await import('~/composables/use-products')
const { useSuggestions } = await import('~/composables/use-suggestions')

interface QueryOptions {
  key: () => unknown[]
  query: () => unknown
  enabled?: () => boolean
  staleTime?: number
  placeholderData?: (previous: unknown) => unknown
}

function lastOptions(): QueryOptions {
  const call = useQuery.mock.calls.at(-1)
  if (!call) throw new Error('useQuery was never called')
  return call[0] as QueryOptions
}

beforeEach(() => {
  useQuery.mockClear()
  $fetch.mockClear()
})

describe('useProductSearch', () => {
  const query = ref(productQuerySchema.parse({ q: 'cocoa', category: ['en:snacks'] }))

  it('keys the cache on the query rather than on the ref', () => {
    useProductSearch(query)

    expect(lastOptions().key()).toEqual(productSearchKey(query.value))
  })

  it('re-reads the query when it changes', () => {
    useProductSearch(query)
    const before = lastOptions().key()

    query.value = productQuerySchema.parse({ q: 'chocolate' })

    expect(lastOptions().key()).not.toEqual(before)
  })

  it('fetches the query it was keyed on', async () => {
    query.value = productQuerySchema.parse({ q: 'cocoa' })
    useProductSearch(query)

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/products', {
      query: expect.objectContaining({ q: 'cocoa' }),
    })
  })

  it('holds the previous page through a refetch', () => {
    useProductSearch(query)

    expect(lastOptions().placeholderData?.({ items: ['held'] })).toEqual({ items: ['held'] })
  })
})

describe('useProductCount', () => {
  const query = ref(productQuerySchema.parse({ q: 'cocoa', sort: 'popularity' }))

  it('keys the cache on the filters the count depends on', () => {
    useProductCount(query, () => true)

    expect(lastOptions().key()).toEqual(productCountKey(query.value))
  })

  it('counts only while its caller says so', () => {
    let allowed = false
    useProductCount(query, () => allowed)
    expect(lastOptions().enabled?.()).toBe(false)

    allowed = true

    expect(lastOptions().enabled?.()).toBe(true)
  })

  it('fetches the count for the query it was keyed on', async () => {
    useProductCount(query, () => true)

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/products/count', { query: { q: 'cocoa' } })
  })

  it('holds the previous count while the next one loads, so the number does not blink', () => {
    useProductCount(query, () => true)

    expect(lastOptions().placeholderData?.({ totalCount: 12 })).toEqual({ totalCount: 12 })
  })
})

describe('useProductFacet', () => {
  const query = ref(productQuerySchema.parse({ q: 'chocolate' }))

  it('keys the cache on the dimension and the search around it', () => {
    useProductFacet('country', query, () => true)

    expect(lastOptions().key()).toEqual(productFacetKey('country', query.value))
  })

  it('asks only while its caller says so, since facet reads are the scarce ones', () => {
    let open = false
    useProductFacet('brand', query, () => open)
    expect(lastOptions().enabled?.()).toBe(false)

    open = true

    expect(lastOptions().enabled?.()).toBe(true)
  })

  it('fetches the facet it was keyed on', async () => {
    useProductFacet('label', query, () => true)

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/products/facets/label', {
      query: { q: 'chocolate' },
    })
  })
})

describe('productDetailQuery', () => {
  it('keys on the barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(['product', '3017620425035'])
  })

  it('builds the same options for the same barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(productDetailQuery('3017620425035').key)
  })

  it('fetches the product it was keyed on', async () => {
    await productDetailQuery('3017620425035').query()

    expect($fetch).toHaveBeenCalledWith('/api/products/3017620425035')
  })
})

describe('useSuggestions', () => {
  it('keys on the trimmed, lowercased term', () => {
    useSuggestions(ref('  ChocoLate  '))

    expect(lastOptions().key()).toEqual(['suggest', 'category,brand', 'chocolate'])
  })

  it('keys a single taxonomy apart from the default mix', () => {
    useSuggestions(ref('choc'), ['country'])

    expect(lastOptions().key()).toEqual(['suggest', 'country', 'choc'])
  })

  it('asks only for the taxonomies it was given', async () => {
    useSuggestions(ref('choc'), ['label'])

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/suggest', {
      query: expect.objectContaining({ q: 'choc', taxonomy: 'label' }),
    })
  })

  it.each([
    ['', false],
    ['c', false],
    ['  c  ', false],
    ['ch', true],
  ])('with %o, allows the request: %s', (term, expected) => {
    useSuggestions(ref(term))

    expect(lastOptions().enabled?.()).toBe(expected)
  })

  it('re-evaluates the gate as the term grows', () => {
    const term = ref('c')
    useSuggestions(term)
    expect(lastOptions().enabled?.()).toBe(false)

    term.value = 'ch'

    expect(lastOptions().enabled?.()).toBe(true)
  })

  it('holds the previous list while the next one loads', () => {
    useSuggestions(ref('chocolate'))

    expect(lastOptions().placeholderData?.([{ id: 'en:snacks' }])).toEqual([{ id: 'en:snacks' }])
  })

  it('asks upstream for the same prefix it keyed on', async () => {
    useSuggestions(ref('  ChocoLate  '))

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/suggest', {
      query: expect.objectContaining({ q: 'chocolate' }),
    })
  })

  it('caches for longer than anything else here, because taxonomies barely move', () => {
    useSuggestions(ref('chocolate'))

    expect(lastOptions().staleTime).toBeGreaterThanOrEqual(1000 * 60 * 60)
  })
})
