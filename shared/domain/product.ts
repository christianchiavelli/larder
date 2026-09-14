import { z } from 'zod'
import { novaGroupSchema, nutriScoreSchema, nutrientProfileSchema } from './nutrition'
import { taxonomyTagSchema } from './taxonomy'

/**
 * The product contract our own API serves.
 *
 * Split in two on purpose. A directory page renders 24 rows at a time and needs
 * roughly a dozen fields; the deep dive needs everything. Serving one fat shape
 * to both would put ~250 upstream keys per row on the wire to render a table.
 * The summary is what a list costs; the detail is what a page costs.
 */

export const productSummarySchema = z.object({
  /** Barcode. The primary key everywhere, kept as a string: leading zeros matter. */
  code: z.string().min(1),
  name: z.string(),
  brands: z.array(z.string()),
  /** Broadest to most specific. May be empty. */
  categories: z.array(taxonomyTagSchema),
  nutriScore: nutriScoreSchema,
  novaGroup: novaGroupSchema.nullable(),
  imageUrl: z.url().nullable(),
  /** Per 100g or 100ml. Individually nullable, see NutrientProfile. */
  nutrients: nutrientProfileSchema,
})

export type ProductSummary = z.infer<typeof productSummarySchema>

export const productDetailSchema = productSummarySchema.extend({
  countries: z.array(taxonomyTagSchema),
  labels: z.array(taxonomyTagSchema),
  additives: z.array(taxonomyTagSchema),
  /** Free text as printed on the pack, for example "400.0 g". Not parseable. */
  quantity: z.string().nullable(),
  servingSize: z.string().nullable(),
  ingredientsText: z.string().nullable(),
  ingredientCount: z.number().int().nonnegative().nullable(),
  /** Green Score, upstream's environmental grade. Same letter scale, different meaning. */
  ecoScore: nutriScoreSchema,
  /** Canonical page upstream, shown as the provenance link. */
  sourceUrl: z.url(),
  /** When upstream last changed the record. Drives the freshness note on the page. */
  lastModified: z.iso.datetime().nullable(),
})

export type ProductDetail = z.infer<typeof productDetailSchema>

/** Products carry a display name only sometimes. Never render an empty heading. */
export function productDisplayName(product: Pick<ProductSummary, 'code' | 'name'>): string {
  const trimmed = product.name.trim()
  return trimmed.length > 0 ? trimmed : `Unnamed product ${product.code}`
}

/**
 * Upstream concatenates brands into one comma-separated string, and the string
 * is user-entered, so it arrives with duplicate casings ("Nutella, NUTELLA"),
 * stray whitespace, and empty segments.
 */
export function normaliseBrands(raw: string | readonly string[] | null | undefined): string[] {
  const parts = typeof raw === 'string' ? raw.split(',') : (raw ?? [])

  const seen = new Map<string, string>()
  for (const part of parts) {
    const brand = part.trim()
    if (brand.length === 0) continue
    // First spelling wins; later casings of the same brand collapse into it.
    const key = brand.toLowerCase()
    if (!seen.has(key)) seen.set(key, brand)
  }

  return [...seen.values()]
}
