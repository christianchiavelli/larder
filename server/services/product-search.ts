import { ZodError } from 'zod'
import {
  FACET_FIELDS,
  maxPageFor,
  type ProductQuery,
  type ProductSearchResult,
} from '#shared/domain/search'
import type { NutriScore } from '#shared/domain/nutrition'
import { buildProductQuery } from '~~/server/utils/lucene'
import { mapFacet, mapSearchHits, upstreamSearchResponseSchema } from '~~/server/upstream/search'
import { toContractError, toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/**
 * Directory search, as a function of a query and an HTTP client.
 *
 * Deliberately not an event handler. Everything interesting here, the page
 * clamp, the facet mapping, the way a partly malformed page still renders, is
 * decision-making, and none of it needs an HTTP request to exercise. Keeping it
 * out of the route means the tests can drive it with a stub client instead of
 * booting a server, and the route is left with the one job it is good at:
 * reading the query string and setting cache headers.
 */

/** Only the fields the summary contract needs. The full record is ~250 keys. */
export const REQUESTED_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'categories_tags',
  'nutriscore_grade',
  'nova_groups',
  'image_front_small_url',
  'image_front_url',
  'nutriments',
].join(',')

export const REQUESTED_FACETS = [...FACET_FIELDS, 'nutriscore_grade'].join(',')

const CONTEXT = { service: 'search-a-licious', operation: 'GET /search' }

function toNutriScoreKey(rawKey: string): NutriScore {
  const grade = rawKey.toLowerCase()
  return grade === 'a' || grade === 'b' || grade === 'c' || grade === 'd' || grade === 'e'
    ? grade
    : 'unknown'
}

export async function searchProducts(
  client: UpstreamClient,
  query: ProductQuery,
): Promise<ProductSearchResult> {
  // Upstream stops tracking past MAX_TRACKED_HITS and serves empty pages beyond
  // it. Clamping means a hand-typed `?page=9999` lands on the last real page
  // rather than on a blank screen with no explanation.
  const page = Math.min(query.page, maxPageFor(query.pageSize))

  const { q, sort_by } = buildProductQuery(query)

  let raw: unknown
  try {
    raw = await client.get('/search', {
      ...(q ? { q } : {}),
      ...(sort_by ? { sort_by } : {}),
      page,
      page_size: query.pageSize,
      fields: REQUESTED_FIELDS,
      facets: REQUESTED_FACETS,
      langs: 'en',
    })
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

  const facets: Record<string, ReturnType<typeof mapFacet>> = {}
  for (const field of FACET_FIELDS) {
    const facet = response.facets?.[field]
    if (facet) facets[field] = mapFacet(facet.items)
  }

  // Several upstream buckets ("unknown", "not-applicable") collapse into our
  // single unknown, so counts are summed rather than assigned.
  const distribution: Partial<Record<NutriScore, number>> = {}
  for (const item of response.facets?.nutriscore_grade?.items ?? []) {
    const key = toNutriScoreKey(item.key)
    distribution[key] = (distribution[key] ?? 0) + item.count
  }

  return {
    items,
    page,
    pageSize: query.pageSize,
    totalCount: response.count,
    isTotalExact: response.is_count_exact,
    // Upstream derives page_count from a truncated count, so it over-reports
    // once the ceiling is hit. Recomputing keeps the pager from offering pages
    // that are known to come back empty.
    pageCount: Math.min(response.page_count, maxPageFor(query.pageSize)),
    facets,
    nutriScoreDistribution: distribution as ProductSearchResult['nutriScoreDistribution'],
  }
}
