import { z } from 'zod'
import { NUTRI_SCORE_GRADES, novaGroupSchema, nutriScoreSchema } from './nutrition'
import { productSummarySchema } from './product'
import { toFilterValue } from './taxonomy'

/**
 * Search contract.
 *
 * This schema is the single definition of what a directory view can ask for. It
 * parses three different callers without forking: the URL query string, the
 * client-side API function, and the server route handler. Keeping one schema is
 * what makes a shareable URL and a valid API call the same thing by
 * construction, instead of two encodings someone has to keep in step by hand.
 */

/**
 * Elasticsearch stops counting past this many matches and pins `count` there,
 * which also makes upstream's own `page_count` a lie beyond it. Paging past the
 * ceiling returns empty pages, so the schema refuses to ask.
 */
export const MAX_TRACKED_HITS = 10_000

export const PAGE_SIZES = [24, 48, 96] as const
export const DEFAULT_PAGE_SIZE = 24

/**
 * Sorts the whole result set, which limits us to fields upstream declares
 * sortable in its index mapping.
 *
 * Nutrient sorts are deliberately absent. `sort_by=nutriments.sugars_100g` is
 * rejected by upstream, and the tempting workaround, sorting the 24 rows we
 * already hold, would label a page-local reordering as if it ranked all 10,000
 * matches. The directory table offers column sorting instead, scoped and
 * labelled as the current page.
 */
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'nutriscore', label: 'Nutri-Score, best first' },
  { value: 'popularity', label: 'Most scanned' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

/** Maps our sort vocabulary to upstream's `sort_by`. Relevance sends nothing. */
export const UPSTREAM_SORT_FIELDS: Record<SortOption, string | null> = {
  // nutriscore_score is a penalty score: lower is a better grade, so ascending.
  nutriscore: 'nutriscore_score',
  popularity: '-popularity_key',
  relevance: null,
}

export const sortSchema = z.enum(SORT_OPTIONS.map((option) => option.value))

/**
 * Query string values arrive as `string | string[] | undefined` depending on how
 * many times the key appears. Normalising before validation keeps every filter
 * field a plain array in the parsed result, so `?brand=a` and `?brand=a&brand=b`
 * do not take different code paths downstream.
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
   * Language prefix stripped. The search index stores brands as a bare slug
   * while every other dimension is prefixed, so `en:olivari` and `olivari` are
   * the same brand and only the second one matches anything. Normalising here
   * covers the suggestion that produced it, the link someone shared, and the
   * URL a reader edited by hand.
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
      values.filter((v): v is (typeof NUTRI_SCORE_GRADES)[number] =>
        (NUTRI_SCORE_GRADES as readonly string[]).includes(v),
      ),
    )
    .default([]),

  nova: z
    .preprocess(
      (value) =>
        value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value],
      z.array(z.coerce.number()),
    )
    .transform((values) => values.filter((v) => novaGroupSchema.safeParse(v).success))
    .pipe(z.array(novaGroupSchema))
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

/** Highest page that can return results for a given page size. */
export function maxPageFor(pageSize: number): number {
  return Math.max(1, Math.floor(MAX_TRACKED_HITS / pageSize))
}

/** True when any filter is applied, ignoring pagination and sort. */
export function hasActiveFilters(query: ProductQuery): boolean {
  return (
    query.q.length > 0 ||
    query.category.length > 0 ||
    query.brand.length > 0 ||
    query.country.length > 0 ||
    query.label.length > 0 ||
    query.nutriScore.length > 0 ||
    query.nova.length > 0
  )
}

/** Number of filters applied, for the "N filters" affordance on narrow screens. */
export function activeFilterCount(query: ProductQuery): number {
  return (
    (query.q.length > 0 ? 1 : 0) +
    query.category.length +
    query.brand.length +
    query.country.length +
    query.label.length +
    query.nutriScore.length +
    query.nova.length
  )
}

/**
 * Serialises a query back to a URL-ready object, omitting anything at its
 * default. Without the omission every link would carry `?page=1&sort=relevance`
 * and a shared URL would be noise.
 */
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

/** Facet dimensions the directory can filter on, and the order they render in. */
export const FACET_FIELDS = [
  'categories_tags',
  'brands_tags',
  'countries_tags',
  'labels_tags',
] as const
export type FacetField = (typeof FACET_FIELDS)[number]

export const facetItemSchema = z.object({
  /** Filter value, a taxonomy id for tag facets. */
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
})

export type FacetItem = z.infer<typeof facetItemSchema>

export const productSearchResultSchema = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  /**
   * Matches found. Capped at MAX_TRACKED_HITS, which is what `isTotalExact`
   * exists to tell the UI: render "10,000+" rather than claiming a real figure.
   */
  totalCount: z.number().int().nonnegative(),
  isTotalExact: z.boolean(),
  pageCount: z.number().int().nonnegative(),
  facets: z.record(z.string(), z.array(facetItemSchema)),
  /** Distribution over the whole match set, not just this page. */
  nutriScoreDistribution: z.record(nutriScoreSchema, z.number().int().nonnegative()),
})

export type ProductSearchResult = z.infer<typeof productSearchResultSchema>

export const suggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  taxonomy: z.string(),
})

export type Suggestion = z.infer<typeof suggestionSchema>
