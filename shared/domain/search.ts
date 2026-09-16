import { z } from 'zod'
import {
  NOVA_UNGROUPED,
  NUTRI_SCORE_VALUES,
  novaFilterValueSchema,
  nutriScoreSchema,
} from './nutrition'
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
    /*
     * Coerced one value at a time rather than all at once. A URL carries every
     * NOVA group as a numeral, but the absence is a word, and `Number('none')`
     * is NaN: coercing the array turned "products with no group" into a value
     * the filter then dropped, which is the whole catalogue back again.
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

/** Highest page that can return results for a given page size. */
export function maxPageFor(pageSize: number): number {
  return Math.max(1, Math.floor(MAX_TRACKED_HITS / pageSize))
}

/**
 * How the reader chose to read the list, as opposed to what they chose to look
 * at. Everything else in the query is a filter.
 */
const READING_KEYS = ['sort', 'page', 'pageSize'] as const

export type FilterKey = Exclude<keyof ProductQuery, (typeof READING_KEYS)[number]>

/**
 * The filter dimensions, read off the schema rather than written out.
 *
 * Four separate places used to name them: whether any is set, how many are set,
 * how they serialise, and how they clear. Adding a dimension meant remembering
 * all four, and forgetting one failed silently in a different way each time,
 * the worst being a "Clear all" that leaves a filter applied while the panel
 * reports none. Derived here, the schema is the only list, and a dimension
 * cannot exist without the helpers knowing about it.
 */
export const FILTER_KEYS = Object.keys(productQuerySchema.shape).filter(
  (key): key is FilterKey => !(READING_KEYS as readonly string[]).includes(key),
)

/** How many values a dimension is currently carrying. Free text counts as one. */
function appliedCount(query: ProductQuery, key: FilterKey): number {
  const value = query[key]
  if (Array.isArray(value)) return value.length
  return value.length > 0 ? 1 : 0
}

/** True when any filter is applied, ignoring pagination and sort. */
export function hasActiveFilters(query: ProductQuery): boolean {
  return FILTER_KEYS.some((key) => appliedCount(query, key) > 0)
}

/** Number of filters applied, for the "N filters" affordance on narrow screens. */
export function activeFilterCount(query: ProductQuery): number {
  return FILTER_KEYS.reduce((total, key) => total + appliedCount(query, key), 0)
}

/** A patch that switches every filter off, leaving sort and page size alone. */
export function clearedFilters(): Pick<ProductQuery, FilterKey> {
  return Object.fromEntries(
    FILTER_KEYS.map((key) => [key, EMPTY_PRODUCT_QUERY[key]]),
  ) as Pick<ProductQuery, FilterKey>
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

  /**
   * How many products carry any NOVA group at all.
   *
   * A count rather than a distribution, because the interesting figure is
   * coverage: the facet has no bucket for a product without the field, so the
   * only way to know how much of the catalogue is classified is to add up the
   * four that exist and compare. Three quarters of it is not.
   */
  novaClassifiedCount: z.number().int().nonnegative(),
})

export type ProductSearchResult = z.infer<typeof productSearchResultSchema>

export const suggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  taxonomy: z.string(),
})

export type Suggestion = z.infer<typeof suggestionSchema>
