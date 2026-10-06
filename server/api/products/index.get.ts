import { getQuery } from 'h3'
import { languageSchema, type Language } from '#shared/domain/language'
import {
  productQuerySchema,
  type ProductQuery,
  type ProductSearchResult,
} from '#shared/domain/search'
import { searchProducts } from '~~/server/services/product-search'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'
import { filterCacheKey } from '~~/server/utils/product-cache-key'

function cacheKeyFor(query: ProductQuery, language: Language): string {
  return [language, filterCacheKey(query), query.sort, query.page, query.pageSize].join('__')
}

export default defineCachedEventHandler(
  async (event): Promise<ProductSearchResult> => {
    const params = getQuery(event)
    return searchProducts(
      useSearchClient(),
      productQuerySchema.parse(params),
      languageSchema.parse(params.lang),
    )
  },
  upstreamCache({
    name: 'product-search',
    maxAge: 60 * 10,
    staleMaxAge: 60 * 60,
    getKey: (event) => {
      const params = getQuery(event)
      return cacheKeyFor(productQuerySchema.parse(params), languageSchema.parse(params.lang))
    },
  }),
)
