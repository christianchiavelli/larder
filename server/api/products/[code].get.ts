import { getQuery, getRouterParam } from 'h3'
import { languageSchema } from '#shared/domain/language'
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
      languageSchema.parse(getQuery(event).lang),
    ),
  upstreamCache({
    name: 'product-detail',
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24,
    getKey: (event) =>
      `${languageSchema.parse(getQuery(event).lang)}__${getRouterParam(event, 'code') ?? 'unknown'}`,
  }),
)
