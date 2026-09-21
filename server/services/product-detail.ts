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

const barcodeSchema = z.string().regex(/^\d{1,14}$/, 'A barcode is between 1 and 14 digits.')

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

  if (response.status !== 1 || !response.product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No product is catalogued under that barcode.',
      data: { reason: 'product_not_found', code },
    })
  }

  return mapProductDetail(response.product, productBase)
}
