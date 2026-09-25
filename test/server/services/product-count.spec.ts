import { describe, expect, it, vi } from 'vitest'
import { countProducts } from '~~/server/services/product-count'
import { productQuerySchema } from '#shared/domain/search'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

const query = (input: Record<string, unknown> = {}) => productQuerySchema.parse(input)

function stubClient(response: Record<string, unknown>) {
  const get = vi.fn().mockResolvedValue({
    hits: [{ code: '3017620425035' }],
    count: 1,
    page: 1,
    page_size: 1,
    page_count: 1,
    is_count_exact: true,
    ...response,
  })
  return { get } satisfies UpstreamClient
}

describe('countProducts', () => {
  it('reads the total and whether the upstream counted all of it', async () => {
    const client = stubClient({ count: 8_958, is_count_exact: true })

    expect(await countProducts(client, query({ q: 'chocolate' }))).toEqual({
      totalCount: 8_958,
      isTotalExact: true,
    })
  })

  it('passes on that the upstream stopped counting', async () => {
    const client = stubClient({ count: 10_000, is_count_exact: false })

    expect(await countProducts(client, query())).toEqual({
      totalCount: 10_000,
      isTotalExact: false,
    })
  })

  it('asks for the same products the export would write', async () => {
    const input = { q: 'granola', category: ['en:biscuits'], nutriScore: ['a'] }
    const client = stubClient({})

    await countProducts(client, query(input))

    const [path, params] = client.get.mock.calls[0]!
    expect(path).toBe('/search')
    expect(params).toMatchObject(buildProductQuery(query(input)))
  })

  it('asks for one row and no facets, since only the count is read', async () => {
    const client = stubClient({})

    await countProducts(client, query())

    const [, params] = client.get.mock.calls[0]!
    expect(params).toMatchObject({ page: 1, page_size: 1, fields: 'code' })
    expect(params).not.toHaveProperty('facets')
  })

  it('reports an upstream outage as a bad gateway', async () => {
    const outage = Object.assign(new Error('boom'), { response: { status: 503 } })
    const client: UpstreamClient = { get: vi.fn().mockRejectedValue(outage) }

    await expect(countProducts(client, query())).rejects.toMatchObject({ statusCode: 502 })
  })
})
