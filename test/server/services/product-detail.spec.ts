import { describe, expect, it, vi } from 'vitest'
import { getProductDetail } from '~~/server/services/product-detail'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

const PRODUCT_BASE = 'https://world.openfoodfacts.org'

function stubClient(response: unknown): UpstreamClient & { get: ReturnType<typeof vi.fn> } {
  return { get: vi.fn().mockResolvedValue(response) }
}

const FOUND = {
  status: 1,
  product: { code: '3017620425035', product_name: 'Nutella', nutriscore_grade: 'e' },
}

describe('getProductDetail', () => {
  it('returns the mapped product for a catalogued barcode', async () => {
    const product = await getProductDetail(stubClient(FOUND), '3017620425035', PRODUCT_BASE)

    expect(product.name).toBe('Nutella')
    expect(product.sourceUrl).toBe(`${PRODUCT_BASE}/product/3017620425035`)
  })

  it.each([
    ['letters', 'abc'],
    ['a traversal attempt', '../../etc/passwd'],
    ['a longer-than-GTIN code', '123456789012345'],
    ['an empty string', ''],
    ['nothing at all', undefined],
  ])('rejects %s with 400 before any request is made', async (_label, code) => {
    const client = stubClient(FOUND)

    await expect(getProductDetail(client, code, PRODUCT_BASE)).rejects.toMatchObject({
      statusCode: 400,
      data: { reason: 'invalid_barcode' },
    })

    // The point of validating first: a malformed code never reaches the
    // outbound URL, so it cannot be used to steer the request somewhere else.
    expect(client.get).not.toHaveBeenCalled()
  })

  it('accepts a short internal code, which upstream assigns to products without a barcode', async () => {
    await expect(getProductDetail(stubClient(FOUND), '42', PRODUCT_BASE)).resolves.toBeDefined()
  })

  /**
   * Upstream answers 200 with `status: 0` for a code it considers malformed,
   * so HTTP status alone is not enough to detect a missing product.
   */
  it('maps a 200 carrying status 0 to a 404', async () => {
    const client = stubClient({ status: 0, status_verbose: 'no code or invalid code' })

    await expect(getProductDetail(client, '99999999999999', PRODUCT_BASE)).rejects.toMatchObject({
      statusCode: 404,
      data: { reason: 'product_not_found' },
    })
  })

  it('maps a 200 with status 1 but no product body to a 404', async () => {
    await expect(
      getProductDetail(stubClient({ status: 1 }), '123', PRODUCT_BASE),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('passes an upstream 404 through', async () => {
    const client: UpstreamClient = {
      get: vi.fn().mockRejectedValue(Object.assign(new Error('nf'), { response: { status: 404 } })),
    }

    await expect(getProductDetail(client, '123', PRODUCT_BASE)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
