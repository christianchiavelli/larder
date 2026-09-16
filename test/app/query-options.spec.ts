import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { productQuerySchema } from '#shared/domain/search'

/**
 * What these composables decide is the options object they hand to Pinia
 * Colada: the cache key, when a request is allowed to fire, and what is shown
 * while the next one loads. The library's own behaviour is not ours to test, so
 * `useQuery` is replaced and the options are read straight off the call.
 */
const useQuery = vi.fn()
vi.mock('@pinia/colada', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pinia/colada')>()),
  useQuery: (options: unknown) => useQuery(options),
}))

const $fetch = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', $fetch)

const { productDetailQuery, productSearchKey, useProductSearch } =
  await import('~/composables/use-products')
const { useSuggestions } = await import('~/composables/use-suggestions')

interface QueryOptions {
  key: () => unknown[]
  query: () => unknown
  enabled?: () => boolean
  staleTime?: number
  placeholderData?: (previous: unknown) => unknown
}

/** The options the composable under test passed to `useQuery`. */
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

  /**
   * The key is a function, so a filter change re-reads the ref. Computing it
   * once at setup would pin the directory to the query it mounted with.
   */
  it('re-reads the query when it changes', () => {
    useProductSearch(query)
    const before = lastOptions().key()

    query.value = productQuerySchema.parse({ q: 'chocolate' })

    expect(lastOptions().key()).not.toEqual(before)
  })

  /**
   * The query is read when it runs, not when the composable was set up, so a
   * request always carries the filters the address bar currently shows.
   */
  it('fetches the query it was keyed on', async () => {
    query.value = productQuerySchema.parse({ q: 'cocoa' })
    useProductSearch(query)

    await lastOptions().query()

    expect($fetch).toHaveBeenCalledWith('/api/products', {
      query: expect.objectContaining({ q: 'cocoa' }),
    })
  })

  /**
   * Without this the grid empties on every keystroke and every checkbox, the
   * layout collapses to its loading state, and the reader loses their place.
   */
  it('holds the previous page through a refetch', () => {
    useProductSearch(query)

    expect(lastOptions().placeholderData?.({ items: ['held'] })).toEqual({ items: ['held'] })
  })
})

describe('productDetailQuery', () => {
  it('keys on the barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(['product', '3017620425035'])
  })

  /**
   * Defined as options rather than a composable so a prefetch from a directory
   * row and the page it opens land on one cache entry.
   */
  it('builds the same options for the same barcode', () => {
    expect(productDetailQuery('3017620425035').key).toEqual(productDetailQuery('3017620425035').key)
  })

  it('fetches the product it was keyed on', async () => {
    await productDetailQuery('3017620425035').query()

    expect($fetch).toHaveBeenCalledWith('/api/products/3017620425035')
  })
})

describe('useSuggestions', () => {
  /**
   * The key is what collapses a typing burst into one request per distinct
   * prefix. Keying on the raw term would make "Choc" and "choc " two entries
   * for one search, and backspacing over a word would refetch every step.
   */
  it('keys on the trimmed, lowercased term', () => {
    useSuggestions(ref('  ChocoLate  '))

    expect(lastOptions().key()).toEqual(['suggest', 'chocolate'])
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

  /**
   * A one-character term matches most of a taxonomy, so the request costs a
   * round trip on upstream's tightest ceiling to suggest nothing useful.
   */
  it('re-evaluates the gate as the term grows', () => {
    const term = ref('c')
    useSuggestions(term)
    expect(lastOptions().enabled?.()).toBe(false)

    term.value = 'ch'

    expect(lastOptions().enabled?.()).toBe(true)
  })

  /**
   * Without it the listbox empties on every keystroke and reappears a moment
   * later, so the option under the pointer moves out from under it.
   */
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
