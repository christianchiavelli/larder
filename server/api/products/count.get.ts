import { getQuery } from 'h3'
import { productQuerySchema, type ProductCount } from '#shared/domain/search'
import { countProducts } from '~~/server/services/product-count'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'
import { filterCacheKey } from '~~/server/utils/product-cache-key'

export default defineCachedEventHandler(
  async (event): Promise<ProductCount> =>
    countProducts(useSearchClient(), productQuerySchema.parse(getQuery(event))),
  upstreamCache({
    name: 'product-count',
    maxAge: 60 * 10,
    staleMaxAge: 60 * 60,
    getKey: (event) => filterCacheKey(productQuerySchema.parse(getQuery(event))),
  }),
)
