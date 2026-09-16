import { z } from 'zod'
import { novaGroupSchema, nutriScoreSchema, nutrientProfileSchema } from './nutrition'
import { taxonomyTagSchema } from './taxonomy'

/**
 * Summary and detail are split: one shape would put ~250 upstream keys per row
 * on the wire to render a table.
 */

/**
 * Three widths from upstream's own CDN. Rewriting the number in the path would
 * break the day filenames change.
 */
export const productImageSchema = z
  .object({
    /** 100px. */
    thumb: z.url().nullable(),
    /** 200px. */
    small: z.url().nullable(),
    /** 400px, the largest outside the original upload. */
    large: z.url().nullable(),
  })
  .nullable()

export type ProductImage = z.infer<typeof productImageSchema>

export const productSummarySchema = z.object({
  /** Barcode, kept as a string: leading zeros matter. */
  code: z.string().min(1),
  name: z.string(),
  brands: z.array(z.string()),
  /** Broadest to most specific. May be empty. */
  categories: z.array(taxonomyTagSchema),
  nutriScore: nutriScoreSchema,
  novaGroup: novaGroupSchema.nullable(),
  image: productImageSchema,
  /** Per 100g or 100ml, each nullable on its own. */
  nutrients: nutrientProfileSchema,
})

export type ProductSummary = z.infer<typeof productSummarySchema>

export const productDetailSchema = productSummarySchema.extend({
  countries: z.array(taxonomyTagSchema),
  labels: z.array(taxonomyTagSchema),
  additives: z.array(taxonomyTagSchema),
  /** Free text as printed on the pack ("400.0 g"). Not parseable. */
  quantity: z.string().nullable(),
  servingSize: z.string().nullable(),
  ingredientsText: z.string().nullable(),
  ingredientCount: z.number().int().nonnegative().nullable(),
  sourceUrl: z.url(),
  lastModified: z.iso.datetime().nullable(),
})

export type ProductDetail = z.infer<typeof productDetailSchema>

/** A product does not always carry a name, and a heading cannot be empty. */
export function productDisplayName(product: Pick<ProductSummary, 'code' | 'name'>): string {
  const trimmed = product.name.trim()
  return trimmed.length > 0 ? trimmed : `Unnamed product ${product.code}`
}

/**
 * Upstream concatenates brands into one user-entered string, so it arrives with
 * duplicate casings, stray whitespace and empty segments.
 */
export function normaliseBrands(raw: string | readonly string[] | null | undefined): string[] {
  const parts = typeof raw === 'string' ? raw.split(',') : (raw ?? [])

  const seen = new Map<string, string>()
  for (const part of parts) {
    const brand = part.trim()
    if (brand.length === 0) continue
    // First spelling wins.
    const key = brand.toLowerCase()
    if (!seen.has(key)) seen.set(key, brand)
  }

  return [...seen.values()]
}
