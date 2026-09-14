import { createError } from 'h3'
import { ZodError, z } from 'zod'
import type { ProductDetail } from '#shared/domain/product'
import {
  PRODUCT_FIELDS,
  mapProductDetail,
  upstreamProductResponseSchema,
} from '~~/server/upstream/product'
import { toContractError, toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/**
 * Single product lookup. See the note in ./product-search.ts on why this is a
 * function rather than an event handler.
 */

/**
 * Barcodes are EAN-8 through GTIN-14, plus the internal codes upstream assigns
 * to products without one. All digits, never longer than 14.
 *
 * This value is interpolated into an outbound URL, so a permissive pattern here
 * is a request-forgery primitive rather than a cosmetic concern. Validating the
 * shape is what keeps `../` from ever reaching it.
 */
export const barcodeSchema = z.string().regex(/^\d{1,14}$/, 'A barcode is between 1 and 14 digits.')

export async function getProductDetail(
  client: UpstreamClient,
  rawCode: string | undefined,
  productBase: string,
): Promise<ProductDetail> {
  const parsed = barcodeSchema.safeParse(rawCode)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That is not a valid barcode.',
      data: { reason: 'invalid_barcode' },
    })
  }

  const code = parsed.data
  const context = { service: 'openfoodfacts-v2', operation: `GET /api/v2/product/${code}` }

  let raw: unknown
  try {
    raw = await client.get(`/api/v2/product/${code}`, { fields: PRODUCT_FIELDS })
  } catch (error) {
    throw toUpstreamError(error, context)
  }

  let response
  try {
    response = upstreamProductResponseSchema.parse(raw)
  } catch (error) {
    if (error instanceof ZodError) throw toContractError(error, context)
    throw error
  }

  // Upstream signals "no such product" two different ways, and only one of them
  // is an HTTP status. A well-formed barcode nobody has catalogued answers 404,
  // which the error mapper above already converted. A barcode upstream
  // considers malformed answers 200 with `status: 0` and no product, and
  // reaches here. Both are a 404 to our caller.
  if (response.status !== 1 || !response.product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No product is catalogued under that barcode.',
      data: { reason: 'product_not_found', code },
    })
  }

  return mapProductDetail(response.product, productBase)
}
