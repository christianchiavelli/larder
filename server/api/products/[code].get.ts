import { getRouterParam } from 'h3'
import type { ProductDetail } from '#shared/domain/product'
import { getProductDetail } from '~~/server/services/product-detail'
import { useProductClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

export default defineCachedEventHandler(
  async (event): Promise<ProductDetail> =>
    getProductDetail(
      useProductClient(),
      getRouterParam(event, 'code'),
      useRuntimeConfig(event).openFoodFacts.productBase,
    ),
  upstreamCache({
    name: 'product-detail',
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24,
    getKey: (event) => getRouterParam(event, 'code') ?? 'unknown',
  }),
)
