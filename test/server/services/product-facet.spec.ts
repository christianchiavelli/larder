import { describe, expect, it, vi } from 'vitest'
import { topFacetValues } from '~~/server/services/product-facet'
import { productQuerySchema } from '#shared/domain/search'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

const query = (input: Record<string, unknown> = {}) => productQuerySchema.parse(input)

function stubClient(facets: Record<string, unknown> = {}) {
  const get = vi.fn().mockResolvedValue({
    hits: [{ code: '3017620425035' }],
    count: 1,
    page: 1,
    page_size: 1,
    page_count: 1,
    is_count_exact: true,
    facets,
  })
  return { get } satisfies UpstreamClient
}

const COUNTRIES = {
  countries_tags: {
    name: 'countries_tags',
    items: [
      { key: 'en:brazil', name: 'Brazil', count: 1_204 },
      { key: 'en:canada', name: 'Canada', count: 310 },
      { key: '--other--', name: 'Other', count: 99 },
    ],
  },
}

describe('topFacetValues', () => {
  it('lists the values of one dimension with how many products each holds', async () => {
    const values = await topFacetValues(stubClient(COUNTRIES), query({ q: 'chocolate' }), 'country')

    expect(values).toEqual([
      { key: 'en:brazil', label: 'Brazil', count: 1_204 },
      { key: 'en:canada', label: 'Canada', count: 310 },
    ])
  })

  it('asks for that one facet and a single row', async () => {
    const client = stubClient(COUNTRIES)

    await topFacetValues(client, query(), 'country')

    const [path, params] = client.get.mock.calls[0]!
    expect(path).toBe('/search')
    expect(params).toMatchObject({
      page: 1,
      page_size: 1,
      fields: 'code',
      facets: 'countries_tags',
    })
  })

  it('scopes the values to the search it was given', async () => {
    const input = { q: 'chocolate', nutriScore: ['a'] }
    const client = stubClient(COUNTRIES)

    await topFacetValues(client, query(input), 'country')

    expect(client.get.mock.calls[0]![1]).toMatchObject(buildProductQuery(query(input)))
  })

  it('lists nothing when the upstream sends no such facet', async () => {
    expect(await topFacetValues(stubClient(), query(), 'label')).toEqual([])
  })

  it('reports an upstream outage as a bad gateway', async () => {
    const outage = Object.assign(new Error('boom'), { response: { status: 503 } })
    const client: UpstreamClient = { get: vi.fn().mockRejectedValue(outage) }

    await expect(topFacetValues(client, query(), 'brand')).rejects.toMatchObject({
      statusCode: 502,
    })
  })
})
