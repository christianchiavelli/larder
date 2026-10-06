import { defineQueryOptions, useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import { fetchProduct, fetchProductCount, fetchProductFacet, fetchProducts } from '~/api/products'
import type { Language } from '#shared/domain/language'
import type { ProductQuery, TagDimension } from '#shared/domain/search'
import { useLanguage } from './use-language'

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

export function productSearchKey(query: ProductQuery, language: Language) {
  return ['products', language, ...filterKeyParts(query), query.sort, query.page, query.pageSize]
}

export function productCountKey(query: ProductQuery) {
  return ['product-count', ...filterKeyParts(query)]
}

export function productFacetKey(dimension: TagDimension, query: ProductQuery, language: Language) {
  return ['product-facet', dimension, language, ...filterKeyParts(query)]
}

export function useProductSearch(query: Ref<ProductQuery>) {
  const language = useLanguage()

  return useQuery({
    key: () => productSearchKey(query.value, language.value),
    query: () => fetchProducts(query.value, language.value),

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
  const language = useLanguage()

  return useQuery({
    key: () => productFacetKey(dimension, query.value, language.value),
    query: () => fetchProductFacet(dimension, query.value, language.value),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export const productDetailQuery = defineQueryOptions(
  ({ code, language }: { code: string; language: Language }) => ({
    key: ['product', language, code],
    query: () => fetchProduct(code, language),
  }),
)
