import { getQuery } from 'h3'
import {
  productQuerySchema,
  type ProductQuery,
  type ProductSearchResult,
} from '#shared/domain/search'
import { searchProducts } from '~~/server/services/product-search'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

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

  return parts.join('__').replace(/[^a-zA-Z0-9_|.-]/g, '_')
}

export default defineCachedEventHandler(
  async (event): Promise<ProductSearchResult> =>
    searchProducts(useSearchClient(), productQuerySchema.parse(getQuery(event))),
  upstreamCache({
    name: 'product-search',
    maxAge: 60 * 10,
    staleMaxAge: 60 * 60,
    getKey: (event) => cacheKeyFor(productQuerySchema.parse(getQuery(event))),
  }),
)
