import { defineQueryOptions, useQuery } from '@pinia/colada'
import { fetchProduct, fetchProducts } from '~/api/products'
import type { ProductQuery } from '#shared/domain/search'

/**
 * Pinia Colada, not `useFetch`: a cache keyed on the query turns a toggle off and
 * back on into no request.
 */

/** Sorted, so filters picked in a different order are one cache entry. */
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

    // Without this the list empties on every keystroke and every checkbox, and
    // the page collapses to its loading state.
    placeholderData: (previous) => previous,
  })
}

/** Options rather than a composable, so a prefetch shares the cache entry. */
export const productDetailQuery = defineQueryOptions((code: string) => ({
  key: ['product', code],
  query: () => fetchProduct(code),
}))
