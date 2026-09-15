import type { ProductDetail } from '#shared/domain/product'
import {
  toQueryParams,
  type ProductQuery,
  type ProductSearchResult,
  type Suggestion,
} from '#shared/domain/search'
import type { TaxonomyName } from '#shared/domain/taxonomy'

/**
 * Typed client for our own API.
 *
 * A thin layer, and worth having anyway: it is the only place that knows a
 * route's path and its response type belong together. Components call these
 * functions, never `$fetch` with a string, so renaming a route is a compiler
 * error rather than a runtime 404 somewhere in a template.
 *
 * These are plain async functions with no caching or reactivity. That belongs
 * to the composables in app/composables, which is what keeps them callable from
 * a test without a Vue instance.
 */

export function fetchProducts(query: ProductQuery): Promise<ProductSearchResult> {
  return $fetch<ProductSearchResult>('/api/products', {
    // The same serialiser the URL uses, so the request carries exactly the
    // state the address bar shows, with defaults omitted from both.
    query: toQueryParams(query),
  })
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
    // Comma-joined rather than repeated, so the request line matches the cache
    // key the route builds and a shared link is one string.
    query: { q: term, taxonomy: [...taxonomies].join(','), limit },
  })
}
