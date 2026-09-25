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

const FLOAT32_DIGITS = 6

export function mapNutriments(raw: Record<string, unknown> | null | undefined): NutrientProfile {
  if (!raw) return { ...EMPTY_NUTRIENT_PROFILE }

  const profile = { ...EMPTY_NUTRIENT_PROFILE }

  for (const key of NUTRIENT_KEYS) {
    const parsed = looseNumber.safeParse(raw[NUTRIMENT_SOURCE_KEYS[key]])
    if (!parsed.success || parsed.data === null) continue

    if (parsed.data < 0) continue

    profile[key] = Number(parsed.data.toPrecision(FLOAT32_DIGITS))
  }

  return profile
}

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
  rejected: number
}

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
