import { z } from 'zod'
import { normaliseBrands, type ProductDetail } from '#shared/domain/product'
import { toTaxonomyTag } from '#shared/domain/taxonomy'
import { looseNumber, looseString } from './coerce'
import { mapProductImage, upstreamImageFields } from './image'
import { mapNovaGroup, mapNutriments, mapNutriScore } from './search'

/**
 * A separate service with a separate shape for the same entity: `brands` is a
 * comma-joined string here and an array in search. What they share is the
 * mapping target.
 */

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
  ...upstreamImageFields,
  nutriments: z.record(z.string(), z.unknown()).nullish(),
  quantity: looseString,
  serving_size: looseString,
  ingredients_text: looseString,
  ingredients_text_en: looseString,
  ingredients_n: looseNumber,
  last_modified_t: looseNumber,
})

/**
 * `status`, not the HTTP status: a missing barcode still answers 200.
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
