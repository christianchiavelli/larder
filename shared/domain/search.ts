import { z } from 'zod'
import {
  NOVA_UNGROUPED,
  NUTRI_SCORE_GRADES,
  novaGroupSchema,
  NUTRI_SCORE_VALUES,
  novaFilterValueSchema,
  nutriScoreSchema,
  type NovaGroup,
  type NutriScore,
} from './nutrition'
import { productSummarySchema } from './product'
import { toFilterValue } from './taxonomy'

export const MAX_TRACKED_HITS = 10_000

export const PAGE_SIZES = [24, 48, 96] as const
export const DEFAULT_PAGE_SIZE = 24

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'nutriscore', label: 'Nutri-Score, best first' },
  { value: 'popularity', label: 'Most scanned' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

export const UPSTREAM_SORT_FIELDS: Record<SortOption, string | null> = {
  nutriscore: 'nutriscore_score',
  popularity: '-popularity_key',
  relevance: null,
}

export const sortSchema = z.enum(SORT_OPTIONS.map((option) => option.value))

const tagList = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return []
      return Array.isArray(value) ? value : [value]
    },
    z.array(z.string().trim().min(1)),
  )
  .transform((values) => [...new Set(values)])
  .pipe(z.array(z.string()).max(20))

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).catch('').default(''),

  category: tagList.default([]),
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

const READING_KEYS = ['sort', 'page', 'pageSize'] as const

export type FilterKey = Exclude<keyof ProductQuery, (typeof READING_KEYS)[number]>

export const FILTER_KEYS = Object.keys(productQuerySchema.shape).filter(
  (key): key is FilterKey => !(READING_KEYS as readonly string[]).includes(key),
)

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
  totalCount: z.number().int().nonnegative(),
  isTotalExact: z.boolean(),
  pageCount: z.number().int().nonnegative(),
  facets: z.record(z.string(), z.array(facetItemSchema)),
  nutriScoreDistribution: z.record(nutriScoreSchema, z.number().int().nonnegative()),

  novaDistribution: z.record(novaGroupSchema, z.number().int().nonnegative()),

  novaClassifiedCount: z.number().int().nonnegative(),
})

export type ProductSearchResult = z.infer<typeof productSearchResultSchema>

export type NutriScoreDistribution = Partial<Record<NutriScore, number>>

export type NovaDistribution = Partial<Record<NovaGroup, number>>

export function catalogueSize(distribution: NutriScoreDistribution): number | null {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
  return total === 0 ? null : total
}

export function gradedShare(distribution: NutriScoreDistribution): number | null {
  const total = catalogueSize(distribution)
  if (total === null) return null
  const graded = NUTRI_SCORE_GRADES.reduce((sum, grade) => sum + (distribution[grade] ?? 0), 0)
  return (graded / total) * 100
}

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
