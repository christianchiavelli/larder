import { getQuery } from 'h3'
import {
  productQuerySchema,
  type ProductQuery,
  type ProductSearchResult,
} from '#shared/domain/search'
import { searchProducts } from '~~/server/services/product-search'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

/**
 * Cached rather than proxied: upstream publishes a 100 req/min ceiling and this
 * fires on every filter change. The search lives in
 * ~~/server/services/product-search.
 */

/**
 * Built from the validated query, not the raw URL: `?brand=b&brand=a` and
 * `?brand=a&brand=b` are the same search.
 */
function cacheKeyFor(query: ProductQuery): string {
  const parts = [
    query.q,
    [...query.category].sort().join('|'),
    [...query.brand].sort().join('|'),
    [...query.country].sort().join('|'),
    [...query.label].sort().join('|'),
    [...query.nutriScore].sort().join('|'),
    [...query.nova].sort().join('|'),
    query.sort,
    query.page,
    query.pageSize,
  ]

  // Colons are the cache driver's own separator, so they cannot appear in a key.
  return parts.join('__').replace(/[^a-zA-Z0-9_|.-]/g, '_')
}

export default defineCachedEventHandler(
  async (event): Promise<ProductSearchResult> =>
    searchProducts(useSearchClient(), productQuerySchema.parse(getQuery(event))),
  upstreamCache({
    name: 'product-search',
    maxAge: 60 * 10,
    // Serve the stale entry while refreshing, so a cache expiry never makes a
    // user wait on upstream.
    staleMaxAge: 60 * 60,
    getKey: (event) => cacheKeyFor(productQuerySchema.parse(getQuery(event))),
    // Nothing here guards against caching failures: Nitro already refuses to
    // store a response with a status of 400 or above, so a 502 from upstream
    // expires with the request instead of being served for ten minutes.
  }),
)
