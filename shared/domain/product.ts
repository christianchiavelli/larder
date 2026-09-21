import { z } from 'zod'
import { novaGroupSchema, nutriScoreSchema, nutrientProfileSchema } from './nutrition'
import { taxonomyTagSchema } from './taxonomy'

export const productImageSchema = z
  .object({
    thumb: z.url().nullable(),
    small: z.url().nullable(),
    large: z.url().nullable(),
  })
  .nullable()

export type ProductImage = z.infer<typeof productImageSchema>

export const productSummarySchema = z.object({
  code: z.string().min(1),
  name: z.string(),
  brands: z.array(z.string()),
  categories: z.array(taxonomyTagSchema),
  nutriScore: nutriScoreSchema,
  novaGroup: novaGroupSchema.nullable(),
  image: productImageSchema,
  nutrients: nutrientProfileSchema,
})

export type ProductSummary = z.infer<typeof productSummarySchema>

export const productDetailSchema = productSummarySchema.extend({
  countries: z.array(taxonomyTagSchema),
  labels: z.array(taxonomyTagSchema),
  additives: z.array(taxonomyTagSchema),
  quantity: z.string().nullable(),
  servingSize: z.string().nullable(),
  ingredientsText: z.string().nullable(),
  ingredientCount: z.number().int().nonnegative().nullable(),
  sourceUrl: z.url(),
  lastModified: z.iso.datetime().nullable(),
})

export type ProductDetail = z.infer<typeof productDetailSchema>

export function productDisplayName(product: Pick<ProductSummary, 'code' | 'name'>): string {
  const trimmed = product.name.trim()
  return trimmed.length > 0 ? trimmed : `Unnamed product ${product.code}`
}

export function normaliseBrands(raw: string | readonly string[] | null | undefined): string[] {
  const parts = typeof raw === 'string' ? raw.split(',') : (raw ?? [])

  const seen = new Map<string, string>()
  for (const part of parts) {
    const brand = part.trim()
    if (brand.length === 0) continue
    const key = brand.toLowerCase()
    if (!seen.has(key)) seen.set(key, brand)
  }

  return [...seen.values()]
}
