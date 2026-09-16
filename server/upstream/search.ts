import { z } from 'zod'
import {
  EMPTY_NUTRIENT_PROFILE,
  NUTRIENT_KEYS,
  type NutrientKey,
  type NutrientProfile,
  type NutriScore,
} from '#shared/domain/nutrition'
import { normaliseBrands, type ProductSummary } from '#shared/domain/product'
import { toTaxonomyTag } from '#shared/domain/taxonomy'
import { looseNumber, looseString } from './coerce'
import { mapProductImage, upstreamImageFields } from './image'
import type { FacetItem } from '#shared/domain/search'

/**
 * Permissive about values, strict about structure. Almost every field is
 * optional in a community database, but `hits` not being a list means this is
 * not a search response, and guessing past that shows an empty directory as if
 * the query matched nothing.
 */

/**
 * Upstream omits a key rather than sending null, and in Zod 4 a union merely
 * including `z.undefined()` still requires the key. So `.nullish()` is
 * load-bearing: without it most of the catalogue fails to parse.
 */

const looseStringArray = z
  .union([z.array(z.union([z.string(), z.number()])), z.string(), z.null()])
  .nullish()
  .transform((value): string[] => {
    if (value === null || value === undefined) return []
    if (typeof value === 'string')
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  })

const upstreamHitSchema = z.looseObject({
  code: z.union([z.string(), z.number()]).transform(String),
  product_name: looseString,
  product_name_en: looseString,
  brands: looseStringArray,
  categories_tags: looseStringArray,
  nutriscore_grade: looseString,
  /** Both spellings exist on the same document and disagree often enough to matter. */
  nova_group: looseNumber,
  nova_groups: looseNumber,
  ...upstreamImageFields,
  nutriments: z.record(z.string(), z.unknown()).nullish(),
})

type UpstreamHit = z.infer<typeof upstreamHitSchema>

const upstreamFacetItemSchema = z.looseObject({
  key: z.union([z.string(), z.number()]).transform(String),
  name: looseString,
  count: z.coerce.number().int().nonnegative().catch(0),
})

const upstreamFacetSchema = z.looseObject({
  name: looseString,
  items: z.array(upstreamFacetItemSchema).default([]),
})

export const upstreamSearchResponseSchema = z.looseObject({
  // Structure we refuse to guess past.
  hits: z.array(z.unknown()),
  count: z.coerce.number().int().nonnegative().catch(0),
  page: z.coerce.number().int().min(1).catch(1),
  page_size: z.coerce.number().int().min(1).catch(24),
  page_count: z.coerce.number().int().nonnegative().catch(0),
  is_count_exact: z.boolean().catch(true),
  facets: z.record(z.string(), upstreamFacetSchema).nullish(),
  warnings: z.array(z.unknown()).nullish(),
  timed_out: z.boolean().nullish(),
})

export type UpstreamSearchResponse = z.infer<typeof upstreamSearchResponseSchema>

/**
 * Only the `_100g` variant. The bare key and `_value` are in whatever unit the
 * pack declared, so comparing across products compares grams to ounces.
 */
const NUTRIMENT_SOURCE_KEYS: Record<NutrientKey, string> = {
  energyKcal: 'energy-kcal_100g',
  fat: 'fat_100g',
  saturatedFat: 'saturated-fat_100g',
  carbohydrates: 'carbohydrates_100g',
  sugars: 'sugars_100g',
  fiber: 'fiber_100g',
  proteins: 'proteins_100g',
  salt: 'salt_100g',
  sodium: 'sodium_100g',
}

export function mapNutriments(raw: Record<string, unknown> | null | undefined): NutrientProfile {
  if (!raw) return { ...EMPTY_NUTRIENT_PROFILE }

  const profile = { ...EMPTY_NUTRIENT_PROFILE }

  for (const key of NUTRIENT_KEYS) {
    const parsed = looseNumber.safeParse(raw[NUTRIMENT_SOURCE_KEYS[key]])
    if (!parsed.success || parsed.data === null) continue

    // Negative mass is a data-entry error, and it drags category averages down.
    if (parsed.data < 0) continue

    profile[key] = parsed.data
  }

  return profile
}

/**
 * Upstream spells "no grade" four ways and means two things by it.
 * `not-applicable` is the scheme excluding a product; a missing field, an empty
 * string and `unknown` all mean nobody has graded it. Anything unrecognised is
 * a gap rather than an exclusion, since guessing otherwise invents a rule.
 */
export function mapNutriScore(raw: string | null): NutriScore {
  if (!raw) return 'unknown'
  const value = raw.toLowerCase()
  if (value === 'a' || value === 'b' || value === 'c' || value === 'd' || value === 'e')
    return value
  return value === 'not-applicable' ? 'not-applicable' : 'unknown'
}

export function mapNovaGroup(
  hit: Pick<UpstreamHit, 'nova_group' | 'nova_groups'>,
): 1 | 2 | 3 | 4 | null {
  const value = hit.nova_group ?? hit.nova_groups
  if (value === null) return null
  const rounded = Math.round(value)
  return rounded === 1 || rounded === 2 || rounded === 3 || rounded === 4 ? rounded : null
}

function mapHit(hit: UpstreamHit): ProductSummary {
  return {
    code: hit.code,
    // The translated field is absent more often, so the raw one backs it up.
    name: hit.product_name_en ?? hit.product_name ?? '',
    brands: normaliseBrands(hit.brands),
    categories: hit.categories_tags.map((id) => toTaxonomyTag(id)),
    nutriScore: mapNutriScore(hit.nutriscore_grade),
    novaGroup: mapNovaGroup(hit),
    image: mapProductImage(hit),
    nutrients: mapNutriments(hit.nutriments),
  }
}

export interface MappedHits {
  items: ProductSummary[]
  /** Records that failed to parse. Reported so the schema can be corrected. */
  rejected: number
}

/**
 * Per hit, so one malformed record renders 23 rows instead of none. Malformed
 * records are the normal condition in a community-edited database.
 */
export function mapSearchHits(hits: readonly unknown[]): MappedHits {
  const items: ProductSummary[] = []
  let rejected = 0

  for (const raw of hits) {
    const parsed = upstreamHitSchema.safeParse(raw)
    if (!parsed.success) {
      rejected++
      continue
    }
    items.push(mapHit(parsed.data))
  }

  return { items, rejected }
}

/**
 * Bookkeeping buckets, not values: `unknown` counts records missing the field
 * and `--other--` is Elasticsearch's remainder. No product carries either, so
 * a checkbox for them returns nothing, and `--other--` drawn as a bar reads as
 * "Other" being the largest category of food in the world.
 */
const SENTINEL_FACET_KEYS = new Set(['unknown', '--other--', 'not-applicable', ''])

/**
 * Facet keys differ by dimension: `categories_tags` is language-prefixed,
 * `brands_tags` is a bare slug. The taxonomy helper handles both.
 */
export function mapFacet(items: readonly z.infer<typeof upstreamFacetItemSchema>[]): FacetItem[] {
  return items
    .filter((item) => !SENTINEL_FACET_KEYS.has(item.key))
    .map((item) => ({
      key: item.key,
      label: toTaxonomyTag(item.key, item.name).label,
      count: item.count,
    }))
}
