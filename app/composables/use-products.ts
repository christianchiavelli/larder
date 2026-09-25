import { defineQueryOptions, useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import { fetchProduct, fetchProductCount, fetchProductFacet, fetchProducts } from '~/api/products'
import type { ProductQuery, TagDimension } from '#shared/domain/search'

function filterKeyParts(query: ProductQuery): string[] {
  return [
    query.q,
    [...query.category].sort().join(','),
    [...query.brand].sort().join(','),
    [...query.country].sort().join(','),
    [...query.label].sort().join(','),
    [...query.nutriScore].sort().join(','),
    [...query.nova].sort().join(','),
  ]
}

export function productSearchKey(query: ProductQuery) {
  return ['products', ...filterKeyParts(query), query.sort, query.page, query.pageSize]
}

export function productCountKey(query: ProductQuery) {
  return ['product-count', ...filterKeyParts(query)]
}

export function productFacetKey(dimension: TagDimension, query: ProductQuery) {
  return ['product-facet', dimension, ...filterKeyParts(query)]
}

export function useProductSearch(query: Ref<ProductQuery>) {
  return useQuery({
    key: () => productSearchKey(query.value),
    query: () => fetchProducts(query.value),

    placeholderData: (previous) => previous,
  })
}

export function useProductCount(query: Ref<ProductQuery>, enabled: () => boolean) {
  return useQuery({
    key: () => productCountKey(query.value),
    query: () => fetchProductCount(query.value),
    enabled,
    staleTime: 1000 * 60 * 5,

    placeholderData: (previous) => previous,
  })
}

export function useProductFacet(
  dimension: TagDimension,
  query: Ref<ProductQuery>,
  enabled: () => boolean,
) {
  return useQuery({
    key: () => productFacetKey(dimension, query.value),
    query: () => fetchProductFacet(dimension, query.value),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export const productDetailQuery = defineQueryOptions((code: string) => ({
  key: ['product', code],
  query: () => fetchProduct(code),
}))
