import { ZodError } from 'zod'
import type { ProductSummary } from '#shared/domain/product'
import {
  FACET_FIELDS,
  maxPageFor,
  type ProductQuery,
  type ProductSearchResult,
  type NovaDistribution,
} from '#shared/domain/search'
import type { NutriScore } from '#shared/domain/nutrition'
import { buildProductQuery } from '~~/server/utils/lucene'
import { IMAGE_FIELDS } from '~~/server/upstream/image'
import {
  SUMMARY_FIELDS,
  mapFacet,
  mapNutriScore,
  mapSearchHits,
  upstreamSearchResponseSchema,
  type UpstreamSearchResponse,
} from '~~/server/upstream/search'
import { toContractError, toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient, UpstreamRequestOptions } from '~~/server/utils/upstream-client'

const REQUESTED_FIELDS = [...SUMMARY_FIELDS, ...IMAGE_FIELDS].join(',')

const REQUESTED_FACETS = [...FACET_FIELDS, 'nutriscore_grade', 'nova_groups'].join(',')

const CONTEXT = { service: 'search-a-licious', operation: 'GET /search' }

export interface SearchPage {
  response: UpstreamSearchResponse
  items: ProductSummary[]
}

export async function fetchSearchPage(
  client: UpstreamClient,
  params: Record<string, unknown>,
  options?: UpstreamRequestOptions,
): Promise<SearchPage> {
  let raw: unknown
  try {
    raw = await client.get('/search', { ...params, langs: 'en' }, options)
  } catch (error) {
    throw toUpstreamError(error, CONTEXT)
  }

  let response
  try {
    response = upstreamSearchResponseSchema.parse(raw)
  } catch (error) {
    if (error instanceof ZodError) throw toContractError(error, CONTEXT)
    throw error
  }

  const { items, rejected } = mapSearchHits(response.hits)

  if (rejected > 0) {
    console.warn('[search] dropped unparseable hits', { rejected, total: response.hits.length })
  }

  return { response, items }
}

export async function searchProducts(
  client: UpstreamClient,
  query: ProductQuery,
): Promise<ProductSearchResult> {
  const page = Math.min(query.page, maxPageFor(query.pageSize))

  const { response, items } = await fetchSearchPage(client, {
    ...buildProductQuery(query),
    page,
    page_size: query.pageSize,
    fields: REQUESTED_FIELDS,
    facets: REQUESTED_FACETS,
  })

  const facets: Record<string, ReturnType<typeof mapFacet>> = {}
  for (const field of FACET_FIELDS) {
    const facet = response.facets?.[field]
    if (facet) facets[field] = mapFacet(facet.items)
  }

  const distribution: Partial<Record<NutriScore, number>> = {}
  for (const item of response.facets?.nutriscore_grade?.items ?? []) {
    const key = mapNutriScore(item.key)
    distribution[key] = (distribution[key] ?? 0) + item.count
  }

  const novaDistribution: NovaDistribution = {}
  for (const item of response.facets?.nova_groups?.items ?? []) {
    const group = Number(item.key)
    if (group === 1 || group === 2 || group === 3 || group === 4) {
      novaDistribution[group] = (novaDistribution[group] ?? 0) + item.count
    }
  }

  const novaClassifiedCount = Object.values(novaDistribution).reduce(
    (total, count) => total + count,
    0,
  )

  return {
    items,
    page,
    pageSize: query.pageSize,
    totalCount: response.count,
    isTotalExact: response.is_count_exact,
    pageCount: Math.min(response.page_count, maxPageFor(query.pageSize)),
    facets,
    nutriScoreDistribution: distribution as ProductSearchResult['nutriScoreDistribution'],
    novaDistribution: novaDistribution as ProductSearchResult['novaDistribution'],
    novaClassifiedCount,
  }
}
