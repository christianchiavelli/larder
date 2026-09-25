import { withQuery } from 'ufo'
import type { ProductDetail } from '#shared/domain/product'
import {
  toQueryParams,
  type ProductQuery,
  type ProductSearchResult,
  type Suggestion,
} from '#shared/domain/search'
import type { TaxonomyName } from '#shared/domain/taxonomy'

export function fetchProducts(query: ProductQuery): Promise<ProductSearchResult> {
  return $fetch<ProductSearchResult>('/api/products', {
    query: toQueryParams(query),
  })
}

export function productExportUrl(query: ProductQuery): string {
  const { page: _page, pageSize: _pageSize, ...params } = toQueryParams(query)
  return withQuery('/api/products.csv', params)
}

export function fetchProduct(code: string): Promise<ProductDetail> {
  return $fetch<ProductDetail>(`/api/products/${encodeURIComponent(code)}`)
}

export function fetchSuggestions(
  term: string,
  taxonomies: readonly TaxonomyName[] = ['category', 'brand'],
  limit = 8,
): Promise<Suggestion[]> {
  return $fetch<Suggestion[]>('/api/suggest', {
    query: { q: term, taxonomy: [...taxonomies].join(','), limit },
  })
}
