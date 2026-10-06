import { withQuery } from 'ufo'
import { DEFAULT_LANGUAGE, type Language } from '#shared/domain/language'
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

function request<T>(path: string, query?: Record<string, unknown>): Promise<T> {
  return $fetch<T>(path, { query, retry: 0 })
}

/**
 * The language goes on a request only when it is not the default, so every
 * English address, and what is cached under it, stays as it was.
 */
function inLanguage(
  params: Record<string, unknown> | undefined,
  language: Language,
): Record<string, unknown> | undefined {
  return language === DEFAULT_LANGUAGE ? params : { ...params, lang: language }
}

function wholeResultParams(query: ProductQuery): Record<string, string | string[]> {
  const { page: _page, pageSize: _pageSize, ...params } = toQueryParams(query)
  return params
}

export function fetchProducts(
  query: ProductQuery,
  language: Language = DEFAULT_LANGUAGE,
): Promise<ProductSearchResult> {
  return request<ProductSearchResult>('/api/products', inLanguage(toQueryParams(query), language))
}

export function fetchProductCount(query: ProductQuery): Promise<ProductCount> {
  const { sort: _sort, ...params } = wholeResultParams(query)
  return request<ProductCount>('/api/products/count', params)
}

export function fetchProductFacet(
  dimension: TagDimension,
  query: ProductQuery,
  language: Language = DEFAULT_LANGUAGE,
): Promise<FacetItem[]> {
  const { sort: _sort, ...params } = wholeResultParams(query)
  return request<FacetItem[]>(`/api/products/facets/${dimension}`, inLanguage(params, language))
}

export function productExportUrl(query: ProductQuery): string {
  return withQuery('/api/products.csv', wholeResultParams(query))
}

export function fetchProduct(
  code: string,
  language: Language = DEFAULT_LANGUAGE,
): Promise<ProductDetail> {
  return request<ProductDetail>(
    `/api/products/${encodeURIComponent(code)}`,
    inLanguage(undefined, language),
  )
}

export const DEFAULT_SUGGEST_TAXONOMIES: readonly TaxonomyName[] = ['category', 'brand']

export function fetchSuggestions(
  term: string,
  taxonomies: readonly TaxonomyName[] = DEFAULT_SUGGEST_TAXONOMIES,
  limit = 8,
  language: Language = DEFAULT_LANGUAGE,
): Promise<Suggestion[]> {
  return request<Suggestion[]>(
    '/api/suggest',
    inLanguage({ q: term, taxonomy: [...taxonomies].join(','), limit }, language),
  )
}
