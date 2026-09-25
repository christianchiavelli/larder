import { withQuery } from 'ufo'
import type { ProductDetail } from '#shared/domain/product'
import {
  toQueryParams,
  type FacetItem,
  type ProductCount,
  type ProductQuery,
  type ProductSearchResult,
  type Suggestion,
  type TagDimension,
} from '#shared/domain/search'
import type { TaxonomyName } from '#shared/domain/taxonomy'

function wholeResultParams(query: ProductQuery): Record<string, string | string[]> {
  const { page: _page, pageSize: _pageSize, ...params } = toQueryParams(query)
  return params
}

export function fetchProducts(query: ProductQuery): Promise<ProductSearchResult> {
  return $fetch<ProductSearchResult>('/api/products', {
    query: toQueryParams(query),
  })
}

export function fetchProductCount(query: ProductQuery): Promise<ProductCount> {
  const { sort: _sort, ...params } = wholeResultParams(query)
  return $fetch<ProductCount>('/api/products/count', { query: params })
}

export function fetchProductFacet(
  dimension: TagDimension,
  query: ProductQuery,
): Promise<FacetItem[]> {
  const { sort: _sort, ...params } = wholeResultParams(query)
  return $fetch<FacetItem[]>(`/api/products/facets/${dimension}`, { query: params })
}

export function productExportUrl(query: ProductQuery): string {
  return withQuery('/api/products.csv', wholeResultParams(query))
}

export function fetchProduct(code: string): Promise<ProductDetail> {
  return $fetch<ProductDetail>(`/api/products/${encodeURIComponent(code)}`)
}

export const DEFAULT_SUGGEST_TAXONOMIES: readonly TaxonomyName[] = ['category', 'brand']

export function fetchSuggestions(
  term: string,
  taxonomies: readonly TaxonomyName[] = DEFAULT_SUGGEST_TAXONOMIES,
  limit = 8,
): Promise<Suggestion[]> {
  return $fetch<Suggestion[]>('/api/suggest', {
    query: { q: term, taxonomy: [...taxonomies].join(','), limit },
  })
}
