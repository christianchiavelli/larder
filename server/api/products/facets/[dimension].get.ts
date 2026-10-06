import { createError, getQuery, getRouterParam } from 'h3'
import { languageSchema } from '#shared/domain/language'
import { isTagDimension, productQuerySchema, type FacetItem } from '#shared/domain/search'
import { topFacetValues } from '~~/server/services/product-facet'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'
import { filterCacheKey } from '~~/server/utils/product-cache-key'

export default defineCachedEventHandler(
  async (event): Promise<FacetItem[]> => {
    const dimension = getRouterParam(event, 'dimension')

    if (!isTagDimension(dimension)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not found.',
        data: { reason: 'not_found' },
      })
    }

    const params = getQuery(event)
    return topFacetValues(
      useSearchClient(),
      productQuerySchema.parse(params),
      dimension,
      languageSchema.parse(params.lang),
    )
  },
  upstreamCache({
    name: 'product-facet',
    maxAge: 60 * 10,
    staleMaxAge: 60 * 60,
    getKey: (event) =>
      [
        String(getRouterParam(event, 'dimension')).replace(/[^a-z]/g, '_'),
        languageSchema.parse(getQuery(event).lang),
        filterCacheKey(productQuerySchema.parse(getQuery(event))),
      ].join('__'),
  }),
)
