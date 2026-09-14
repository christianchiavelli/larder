import { defineQueryOptions, useQuery } from '@pinia/colada'
import { fetchProduct, fetchProducts } from '~/api/products'
import type { ProductQuery } from '#shared/domain/search'

/**
 * Data access for the directory and the product page.
 *
 * Pinia Colada rather than `useFetch`, for one reason that matters here: the
 * directory refetches on every filter change, and most of those changes are a
 * user toggling something off and back on. A cache keyed on the query turns
 * that into no request at all, and deduplicates the burst that a fast typist
 * generates. `useFetch` would issue every one of them.
 */

/**
 * Cache key for a search.
 *
 * Built from the parsed query rather than the URL, and sorted, so the same
 * search written two ways is one cache entry. Filters selected in a different
 * order are the same search, and paying for it twice would be a cache that
 * misses precisely when a user is exploring.
 */
export function productSearchKey(query: ProductQuery) {
  return [
    'products',
    query.q,
    [...query.category].sort().join(','),
    [...query.brand].sort().join(','),
    [...query.country].sort().join(','),
    [...query.label].sort().join(','),
    [...query.nutriScore].sort().join(','),
    [...query.nova].sort().join(','),
    query.sort,
    query.page,
    query.pageSize,
  ]
}

export function useProductSearch(query: Ref<ProductQuery>) {
  return useQuery({
    key: () => productSearchKey(query.value),
    query: () => fetchProducts(query.value),

    /**
     * Keeps the current results on screen while the next set loads.
     *
     * Without this, the key change empties the list and the page collapses to
     * its loading state on every keystroke and every checkbox. The table would
     * jump, the scroll position would be lost, and the surrounding layout would
     * shift. Holding the previous page means only the numbers change.
     */
    placeholderData: (previous) => previous,
  })
}

/**
 * A single product, addressed by barcode.
 *
 * Defined as options rather than a composable so the deep dive page and any
 * future prefetch, such as hovering a directory row, share one cache entry
 * instead of each holding their own.
 */
export const productDetailQuery = defineQueryOptions((code: string) => ({
  key: ['product', code],
  query: () => fetchProduct(code),
}))
