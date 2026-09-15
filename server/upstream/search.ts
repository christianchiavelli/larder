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
 * Upstream contract for search.openfoodfacts.org, and the mapping from it into
 * our domain.
 *
 * The schema is permissive about values and strict about structure. Upstream is
 * a community database where almost every field is optional in practice, so
 * demanding a product name would reject records that are perfectly renderable.
 * What we do not tolerate is `hits` not being a list: that means the response is
 * not a search response at all, and guessing past it would surface an empty
 * directory as if the query legitimately matched nothing.
 */

/**
 * Upstream omits a key entirely when it has no value, rather than sending null.
 *
 * `.nullish()` is load-bearing and not decoration: in Zod 4 a union that merely
 * includes `z.undefined()` still requires the key to be present, so a schema
 * without it rejects every record that is missing any optional field. That is
 * most of the catalogue.
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
 * Where each modelled nutrient lives in the upstream `nutriments` bag.
 *
 * Only the `_100g` variant is read. The bare key and the `_value` key are in
 * whatever unit the pack declared, so comparing them across products would be
 * comparing grams to millilitres to ounces.
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

    // Negative mass is a data-entry error, not a measurement. Upstream has a
    // handful. Dropping them keeps category averages from being dragged under.
    if (parsed.data < 0) continue

    profile[key] = parsed.data
  }

  return profile
}

/**
 * Upstream spells "no grade" four ways, and means two things by it.
 *
 * `not-applicable` is the scheme excluding a product; a missing field, an empty
 * string and the literal `unknown` all mean nobody has graded it. Everything
 * unrecognised lands on `unknown` too, because an absence we cannot explain is
 * a gap and not an exclusion, and guessing the other way would invent a rule
 * the scheme does not have.
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
    // `product_name_en` is the translated field and is absent more often than
    // the raw one, so it leads and `product_name` backs it up.
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
 * Maps hits individually so one malformed record cannot blank the page.
 *
 * A directory where 23 of 24 rows are fine should render 23 rows. Parsing the
 * array as a unit would turn a single upstream typo into an outage, and this is
 * a read-only view of a community-edited database: malformed records are the
 * normal condition, not the exception.
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
 * Facet keys are not uniform across dimensions: `categories_tags` returns
 * language-prefixed ids while `brands_tags` returns bare slugs. Both go through
 * the taxonomy helper, which leaves a prefixed id alone and humanises a slug.
 */
/**
 * Facet buckets that are bookkeeping rather than values.
 *
 * `unknown` counts records missing the field. `--other--` is Elasticsearch's
 * remainder bucket, holding everything outside the top N it returned.
 *
 * Neither is a tag any product carries, so neither can be filtered on: offering
 * them would be offering a checkbox that returns nothing. `--other--` also
 * distorts every chart it lands in, because the remainder of a long tail is
 * necessarily larger than any single head value. Drawn as a bar it reads as
 * "Other" being the largest category of food in the world, at six million
 * products, dwarfing every real category beside it.
 */
const SENTINEL_FACET_KEYS = new Set(['unknown', '--other--', 'not-applicable', ''])

export function mapFacet(items: readonly z.infer<typeof upstreamFacetItemSchema>[]): FacetItem[] {
  return items
    .filter((item) => !SENTINEL_FACET_KEYS.has(item.key))
    .map((item) => ({
      key: item.key,
      label: toTaxonomyTag(item.key, item.name).label,
      count: item.count,
    }))
}
