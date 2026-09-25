import { getQuery } from 'h3'
import {
  productQuerySchema,
  type ProductQuery,
  type ProductSearchResult,
} from '#shared/domain/search'
import { searchProducts } from '~~/server/services/product-search'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'
import { filterCacheKey } from '~~/server/utils/product-cache-key'

function cacheKeyFor(query: ProductQuery): string {
  return [filterCacheKey(query), query.sort, query.page, query.pageSize].join('__')
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
