import { z } from 'zod'
import {
  NOVA_UNGROUPED,
  NUTRI_SCORE_GRADES,
  NUTRI_SCORE_VALUES,
  novaFilterValueSchema,
  nutriScoreSchema,
  type NutriScore,
} from './nutrition'
import { productSummarySchema } from './product'
import { toFilterValue } from './taxonomy'

/**
 * One schema for the URL, the client function and the route, so a shareable link
 * and a valid API call are the same thing by construction.
 */

/**
 * Elasticsearch stops counting past this and derives `page_count` from the
 * truncated figure, so it advertises pages that return nothing.
 */
export const MAX_TRACKED_HITS = 10_000

export const PAGE_SIZES = [24, 48, 96] as const
export const DEFAULT_PAGE_SIZE = 24

/**
 * Only fields upstream declares sortable. Nutrient sorts are absent on purpose:
 * reordering 24 rows would be labelled as a ranking over every match.
 */
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'nutriscore', label: 'Nutri-Score, best first' },
  { value: 'popularity', label: 'Most scanned' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

export const UPSTREAM_SORT_FIELDS: Record<SortOption, string | null> = {
  // nutriscore_score is a penalty score: lower is a better grade, so ascending.
  nutriscore: 'nutriscore_score',
  popularity: '-popularity_key',
  relevance: null,
}

export const sortSchema = z.enum(SORT_OPTIONS.map((option) => option.value))

/**
 * Normalised before validation, so `?brand=a` and `?brand=a&brand=b` do not take
 * different code paths downstream.
 */
const tagList = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return []
      return Array.isArray(value) ? value : [value]
    },
    z.array(z.string().trim().min(1)),
  )
  // A filter repeated in a shared URL must not double-count in the request.
  .transform((values) => [...new Set(values)])
  .pipe(z.array(z.string()).max(20))

export const productQuerySchema = z.object({
  /** Free text. Upstream tokenises it; we only bound the length. */
  q: z.string().trim().max(120).catch('').default(''),

  category: tagList.default([]),
  /**
   * Language prefix stripped: the index stores brands as a bare slug while every
   * other dimension is prefixed, so only `olivari` matches anything.
   */
  brand: tagList
    .transform((values) => [...new Set(values.map((id) => toFilterValue('brand', id)))])
    .default([]),
  country: tagList.default([]),
  label: tagList.default([]),

  nutriScore: z
    .preprocess(
      (value) =>
        value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value],
      z.array(z.string()),
    )
    // A hand-edited URL should drop the bad value, not 400 the whole page.
    .transform((values) =>
      values.filter((v): v is (typeof NUTRI_SCORE_VALUES)[number] =>
        (NUTRI_SCORE_VALUES as readonly string[]).includes(v),
      ),
    )
    .default([]),

  nova: z
    .preprocess(
      (value) =>
        value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value],
      z.array(z.union([z.string(), z.number()])),
    )
    /**
     * One value at a time: a URL carries every NOVA group as a numeral and the
     * absence as a word, and `Number('none')` is NaN.
     */
    .transform((values) =>
      values
        .map((value) => (value === NOVA_UNGROUPED ? value : Number(value)))
        .filter((value) => novaFilterValueSchema.safeParse(value).success),
    )
    .pipe(z.array(novaFilterValueSchema))
    .default([]),

  sort: sortSchema.catch('relevance').default('relevance'),

  page: z.coerce.number().int().min(1).catch(1).default(1),

  pageSize: z.coerce
    .number()
    .int()
    .transform((size) =>
      (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    )
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
})

export type ProductQuery = z.infer<typeof productQuerySchema>

export const EMPTY_PRODUCT_QUERY: ProductQuery = productQuerySchema.parse({})

export function maxPageFor(pageSize: number): number {
  return Math.max(1, Math.floor(MAX_TRACKED_HITS / pageSize))
}

/** How the list is read rather than what is in it. The rest are filters. */
const READING_KEYS = ['sort', 'page', 'pageSize'] as const

export type FilterKey = Exclude<keyof ProductQuery, (typeof READING_KEYS)[number]>

/**
 * Derived, so the schema is the only list. Written out, the four helpers below
 * each held a copy and forgetting one failed silently.
 */
export const FILTER_KEYS = Object.keys(productQuerySchema.shape).filter(
  (key): key is FilterKey => !(READING_KEYS as readonly string[]).includes(key),
)

/** Free text counts as one. */
function appliedCount(query: ProductQuery, key: FilterKey): number {
  const value = query[key]
  if (Array.isArray(value)) return value.length
  return value.length > 0 ? 1 : 0
}

export function hasActiveFilters(query: ProductQuery): boolean {
  return FILTER_KEYS.some((key) => appliedCount(query, key) > 0)
}

export function activeFilterCount(query: ProductQuery): number {
  return FILTER_KEYS.reduce((total, key) => total + appliedCount(query, key), 0)
}

export function clearedFilters(): Pick<ProductQuery, FilterKey> {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, EMPTY_PRODUCT_QUERY[key]])) as Pick<
    ProductQuery,
    FilterKey
  >
}

/** Omits anything at its default, or every link carries `?page=1&sort=relevance`. */
export function toQueryParams(query: ProductQuery): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}

  if (query.q) params.q = query.q
  if (query.category.length) params.category = query.category
  if (query.brand.length) params.brand = query.brand
  if (query.country.length) params.country = query.country
  if (query.label.length) params.label = query.label
  if (query.nutriScore.length) params.nutriScore = query.nutriScore
  if (query.nova.length) params.nova = query.nova.map(String)
  if (query.sort !== 'relevance') params.sort = query.sort
  if (query.page !== 1) params.page = String(query.page)
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.pageSize = String(query.pageSize)

  return params
}

/** In render order. */
export const FACET_FIELDS = [
  'categories_tags',
  'brands_tags',
  'countries_tags',
  'labels_tags',
] as const
export type FacetField = (typeof FACET_FIELDS)[number]

export const facetItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
})

export type FacetItem = z.infer<typeof facetItemSchema>

export const productSearchResultSchema = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  /** Capped at MAX_TRACKED_HITS, which is what `isTotalExact` is for. */
  totalCount: z.number().int().nonnegative(),
  isTotalExact: z.boolean(),
  pageCount: z.number().int().nonnegative(),
  facets: z.record(z.string(), z.array(facetItemSchema)),
  /** Distribution over the whole match set, not just this page. */
  nutriScoreDistribution: z.record(nutriScoreSchema, z.number().int().nonnegative()),

  /**
   * A count, not a distribution: the facet has no bucket for a product without the
   * field.
   */
  novaClassifiedCount: z.number().int().nonnegative(),
})

export type ProductSearchResult = z.infer<typeof productSearchResultSchema>

/**
 * Partial on purpose. Upstream omits a bucket it has no products for, and Zod's
 * record over an enum types every key as present, which is stricter than what
 * the data ever is.
 */
export type NutriScoreDistribution = Partial<Record<NutriScore, number>>

/**
 * How many products the distribution describes.
 *
 * Every bucket, rather than a list of the ones that existed when this was
 * written. Naming them cost 71,025 products the day the ungraded bucket was
 * split in two: nothing failed, the headline simply described a smaller
 * catalogue than the chart beside it.
 *
 * Null for an empty distribution, which is a loading state rather than a
 * catalogue of no products.
 */
export function catalogueSize(distribution: NutriScoreDistribution): number | null {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
  return total === 0 ? null : total
}

/** Share of the catalogue carrying a Nutri-Score, as a percentage. */
export function gradedShare(distribution: NutriScoreDistribution): number | null {
  const total = catalogueSize(distribution)
  if (total === null) return null
  const graded = NUTRI_SCORE_GRADES.reduce((sum, grade) => sum + (distribution[grade] ?? 0), 0)
  return (graded / total) * 100
}

/** Share carrying a NOVA group, which the facet can only report as a count. */
export function classifiedShare(
  distribution: NutriScoreDistribution,
  novaClassifiedCount: number,
): number | null {
  const total = catalogueSize(distribution)
  return total === null ? null : (novaClassifiedCount / total) * 100
}

export const suggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  taxonomy: z.string(),
})

export type Suggestion = z.infer<typeof suggestionSchema>
