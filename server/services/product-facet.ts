import {
  FACET_FIELD_OF,
  type FacetItem,
  type ProductQuery,
  type TagDimension,
} from '#shared/domain/search'
import { mapFacet } from '~~/server/upstream/search'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'
import { fetchSearchPage } from './product-search'

export async function topFacetValues(
  client: UpstreamClient,
  query: ProductQuery,
  dimension: TagDimension,
): Promise<FacetItem[]> {
  const field = FACET_FIELD_OF[dimension]

  const { response } = await fetchSearchPage(client, {
    ...buildProductQuery(query),
    page: 1,
    page_size: 1,
    fields: 'code',
    facets: field,
  })

  const facet = response.facets?.[field]
  return facet ? mapFacet(facet.items) : []
}
