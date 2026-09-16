import { getRouterParam } from 'h3'
import type { ProductDetail } from '#shared/domain/product'
import { getProductDetail } from '~~/server/services/product-detail'
import { useProductClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

/**
 * Reads the v2 REST API rather than the search index: the index carries only
 * what a result row needs. The lookup lives in ~~/server/services/product-detail.
 */
export default defineCachedEventHandler(
  async (event): Promise<ProductDetail> =>
    getProductDetail(
      useProductClient(),
      getRouterParam(event, 'code'),
      useRuntimeConfig(event).openFoodFacts.productBase,
    ),
  upstreamCache({
    name: 'product-detail',
    // A product record changes when a contributor edits it, which is rare, and
    // being an hour behind on an ingredient list costs nothing.
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24,
    getKey: (event) => getRouterParam(event, 'code') ?? 'unknown',
  }),
)
