import { defineQueryOptions, useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import { fetchProduct, fetchProducts } from '~/api/products'
import type { ProductQuery } from '#shared/domain/search'

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

    placeholderData: (previous) => previous,
  })
}

export const productDetailQuery = defineQueryOptions((code: string) => ({
  key: ['product', code],
  query: () => fetchProduct(code),
}))
