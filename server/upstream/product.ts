import { z } from 'zod'
import { normaliseBrands, type ProductDetail } from '#shared/domain/product'
import { toTaxonomyTag } from '#shared/domain/taxonomy'
import { mapProductImage } from './image'
import { mapNovaGroup, mapNutriments, mapNutriScore } from './search'

/**
 * Upstream contract for the v2 product endpoint.
 *
 * A separate service from search, with a separate shape for the same entity:
 * `brands` is a comma-joined string here and an array there, and the nutriment
 * bag carries four suffix variants per nutrient rather than just `_100g`.
 * Neither schema is derived from the other because they genuinely differ; what
 * they share is the mapping target.
 */

/** See the note in ./search.ts: `.nullish()` is what makes an absent key legal. */
const looseString = z
  .union([z.string(), z.number(), z.null()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined ? null : String(value).trim() || null,
  )

const looseNumber = z
  .union([z.number(), z.string(), z.null()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : null
  })

const looseTagArray = z
  .union([z.array(z.union([z.string(), z.number()])), z.null()])
  .nullish()
  .transform((value): string[] =>
    value === null || value === undefined
      ? []
      : value.map((entry) => String(entry).trim()).filter(Boolean),
  )

const upstreamProductSchema = z.looseObject({
  code: z.union([z.string(), z.number()]).transform(String),
  product_name: looseString,
  product_name_en: looseString,
  brands: looseString,
  categories_tags: looseTagArray,
  countries_tags: looseTagArray,
  labels_tags: looseTagArray,
  additives_tags: looseTagArray,
  nutriscore_grade: looseString,
  nova_group: looseNumber,
  nova_groups: looseNumber,
  ecoscore_grade: looseString,
  image_front_thumb_url: looseString,
  image_front_small_url: looseString,
  image_front_url: looseString,
  image_thumb_url: looseString,
  image_small_url: looseString,
  image_url: looseString,
  nutriments: z.record(z.string(), z.unknown()).nullish(),
  quantity: looseString,
  serving_size: looseString,
  ingredients_text: looseString,
  ingredients_text_en: looseString,
  ingredients_n: looseNumber,
  last_modified_t: looseNumber,
})

/**
 * `status` is the field that says whether the product exists. A missing barcode
 * still answers 200, so treating HTTP status as the signal would render an
 * empty product page instead of a 404.
 */
export const upstreamProductResponseSchema = z.looseObject({
  status: z.coerce.number().int().catch(0),
  code: z.union([z.string(), z.number()]).transform(String).nullish(),
  product: upstreamProductSchema.nullish(),
})

export type UpstreamProductResponse = z.infer<typeof upstreamProductResponseSchema>

/** The `_100g` keys the summary mapper reads, plus the detail-only ones. */
export const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'categories_tags',
  'countries_tags',
  'labels_tags',
  'additives_tags',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'image_front_thumb_url',
  'image_front_small_url',
  'image_front_url',
  'image_thumb_url',
  'image_small_url',
  'image_url',
  'nutriments',
  'quantity',
  'serving_size',
  'ingredients_text',
  'ingredients_text_en',
  'ingredients_n',
  'last_modified_t',
].join(',')

function toIsoOrNull(unixSeconds: number | null): string | null {
  if (unixSeconds === null || unixSeconds <= 0) return null
  const date = new Date(unixSeconds * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function mapProductDetail(
  raw: z.infer<typeof upstreamProductSchema>,
  productBase: string,
): ProductDetail {
  return {
    code: raw.code,
    name: raw.product_name_en ?? raw.product_name ?? '',
    brands: normaliseBrands(raw.brands),
    categories: raw.categories_tags.map((id) => toTaxonomyTag(id)),
    countries: raw.countries_tags.map((id) => toTaxonomyTag(id)),
    labels: raw.labels_tags.map((id) => toTaxonomyTag(id)),
    additives: raw.additives_tags.map((id) => toTaxonomyTag(id)),
    nutriScore: mapNutriScore(raw.nutriscore_grade),
    novaGroup: mapNovaGroup(raw),
    // Upstream renamed Eco-Score to Green Score but kept the field name. Same
    // letter scale as Nutri-Score, measuring something entirely different.
    ecoScore: mapNutriScore(raw.ecoscore_grade),
    image: mapProductImage(raw),
    nutrients: mapNutriments(raw.nutriments),
    quantity: raw.quantity,
    servingSize: raw.serving_size,
    ingredientsText: raw.ingredients_text_en ?? raw.ingredients_text,
    ingredientCount: raw.ingredients_n === null ? null : Math.max(0, Math.round(raw.ingredients_n)),
    sourceUrl: `${productBase}/product/${encodeURIComponent(raw.code)}`,
    lastModified: toIsoOrNull(raw.last_modified_t),
  }
}
