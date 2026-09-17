import { describe, expect, it, vi } from 'vitest'
import { searchProducts } from '~~/server/services/product-search'
import { productQuerySchema, MAX_TRACKED_HITS } from '#shared/domain/search'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

const query = (input: Record<string, unknown> = {}) => productQuerySchema.parse(input)

/** A client that answers with whatever the test hands it, and records the call. */
function stubClient(response: unknown): UpstreamClient & { get: ReturnType<typeof vi.fn> } {
  const get = vi.fn().mockResolvedValue(response)
  return { get }
}

function failingClient(error: unknown): UpstreamClient {
  return { get: vi.fn().mockRejectedValue(error) }
}

const HIT = {
  code: '123',
  product_name: 'Test product',
  nutriscore_grade: 'b',
  nutriments: { sugars_100g: 5 },
}

function upstreamResponse(overrides: Record<string, unknown> = {}) {
  return {
    hits: [HIT],
    count: 1,
    page: 1,
    page_size: 24,
    page_count: 1,
    is_count_exact: true,
    ...overrides,
  }
}

describe('searchProducts', () => {
  it('maps a straightforward response into the domain contract', async () => {
    const client = stubClient(upstreamResponse())

    const result = await searchProducts(client, query({ q: 'test' }))

    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.name).toBe('Test product')
    expect(result.totalCount).toBe(1)
    expect(result.isTotalExact).toBe(true)
  })

  it('requests only the fields the summary needs, not the full record', async () => {
    const client = stubClient(upstreamResponse())

    await searchProducts(client, query({ q: 'test' }))

    const [path, params] = client.get.mock.calls[0]!
    expect(path).toBe('/search')
    expect(String(params.fields)).toContain('code')
    expect(String(params.fields)).not.toContain('ecoscore_data')
  })

  it('passes the built Lucene query upstream', async () => {
    const client = stubClient(upstreamResponse())

    await searchProducts(client, query({ q: 'granola', category: 'en:biscuits' }))

    expect(client.get.mock.calls[0]![1].q).toBe('granola AND categories_tags:"en:biscuits"')
  })

  /**
   * Upstream derives `page_count` from the truncated count, so it advertises pages
   * that return nothing.
   */
  it('clamps a page beyond the tracking ceiling to the last real page', async () => {
    const client = stubClient(upstreamResponse({ count: MAX_TRACKED_HITS, is_count_exact: false }))

    const result = await searchProducts(client, query({ page: '9999', pageSize: '24' }))

    const lastRealPage = Math.floor(MAX_TRACKED_HITS / 24)
    expect(result.page).toBe(lastRealPage)
    expect(client.get.mock.calls[0]![1].page).toBe(lastRealPage)
  })

  it('caps the advertised page count so the pager cannot offer empty pages', async () => {
    const client = stubClient(
      upstreamResponse({ count: MAX_TRACKED_HITS, page_count: 99_999, is_count_exact: false }),
    )

    const result = await searchProducts(client, query({ pageSize: '24' }))

    expect(result.pageCount).toBe(Math.floor(MAX_TRACKED_HITS / 24))
  })

  it('reports an approximate total as approximate', async () => {
    const client = stubClient(upstreamResponse({ count: 10_000, is_count_exact: false }))

    const result = await searchProducts(client, query())

    expect(result.isTotalExact).toBe(false)
    expect(result.totalCount).toBe(10_000)
  })

  it('keeps the readable rows when part of a page is malformed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = stubClient(upstreamResponse({ hits: [HIT, { junk: true }, HIT], count: 3 }))

    const result = await searchProducts(client, query())

    expect(result.items).toHaveLength(2)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('reports the two ungraded buckets apart, and sums only synonyms', async () => {
    const client = stubClient(
      upstreamResponse({
        facets: {
          nutriscore_grade: {
            name: 'nutriscore_grade',
            items: [
              { key: 'a', name: 'a', count: 10 },
              { key: 'unknown', name: 'unknown', count: 5 },
              { key: 'not-applicable', name: 'not-applicable', count: 3 },
              // A spelling of "nobody graded this" that is not the word itself.
              { key: '', name: '', count: 2 },
            ],
          },
        },
      }),
    )

    const result = await searchProducts(client, query())

    expect(result.nutriScoreDistribution).toEqual({
      a: 10,
      unknown: 7,
      'not-applicable': 3,
    })
  })

  it('exposes only the facet dimensions the directory filters on', async () => {
    const client = stubClient(
      upstreamResponse({
        facets: {
          brands_tags: { name: 'brands_tags', items: [{ key: 'lu', name: 'lu', count: 4 }] },
          something_else: { name: 'something_else', items: [{ key: 'x', name: 'x', count: 1 }] },
        },
      }),
    )

    const result = await searchProducts(client, query())

    expect(Object.keys(result.facets)).toEqual(['brands_tags'])
    expect(result.facets.brands_tags![0]!.label).toBe('Lu')
  })

  it('returns an empty result set without special-casing it', async () => {
    const client = stubClient(upstreamResponse({ hits: [], count: 0, page_count: 0 }))

    const result = await searchProducts(client, query({ q: 'nothing matches this' }))

    expect(result.items).toEqual([])
    expect(result.totalCount).toBe(0)
  })

  it('translates an upstream outage into 502, not into an empty directory', async () => {
    const error = Object.assign(new Error('boom'), { response: { status: 503 } })

    await expect(searchProducts(failingClient(error), query())).rejects.toMatchObject({
      statusCode: 502,
    })
  })

  it('translates a timeout into 504', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' })

    await expect(searchProducts(failingClient(timeout), query())).rejects.toMatchObject({
      statusCode: 504,
    })
  })

  /**
   * `hits` not being a list means this is not a search response. Reading it as
   * zero results presents an outage as a legitimately empty search.
   */
  it('refuses to read a structurally wrong response as an empty result', async () => {
    const client = stubClient({ hits: 'not a list', count: 0 })

    await expect(searchProducts(client, query())).rejects.toMatchObject({ statusCode: 502 })
  })
})

describe('NOVA coverage', () => {
  /**
   * The facet has no bucket for a product without the field, so coverage only
   * exists as the sum of the buckets that do.
   */
  it('adds up the groups that exist, since the absence has no bucket', async () => {
    const client = stubClient(
      upstreamResponse({
        facets: {
          nova_groups: {
            name: 'nova_groups',
            items: [
              { key: '1', name: '1', count: 11 },
              { key: '4', name: '4', count: 31 },
            ],
          },
        },
      }),
    )

    const result = await searchProducts(client, query())

    expect(result.novaClassifiedCount).toBe(42)
  })

  /**
   * Per group as well as summed. The front page names one group and says how
   * large it is, which the total cannot answer, and the facet was being reduced
   * to that total before anything asked.
   */
  it('keeps the groups apart rather than only their sum', async () => {
    const client = stubClient(
      upstreamResponse({
        facets: {
          nova_groups: {
            name: 'nova_groups',
            items: [
              { key: '1', name: '1', count: 11 },
              { key: '4', name: '4', count: 31 },
            ],
          },
        },
      }),
    )

    const result = await searchProducts(client, query())

    expect(result.novaDistribution).toEqual({ 1: 11, 4: 31 })
  })

  /**
   * Upstream is community-edited and the facet returns whatever is on the
   * documents. A group outside 1 to 4 is not a fifth kind of processing, it is
   * a bad record, and letting it through would put it in a chart axis.
   */
  it('drops a group the scale does not define', async () => {
    const client = stubClient(
      upstreamResponse({
        facets: {
          nova_groups: {
            name: 'nova_groups',
            items: [
              { key: '4', name: '4', count: 31 },
              { key: '9', name: '9', count: 7 },
              { key: 'unknown', name: 'unknown', count: 5 },
            ],
          },
        },
      }),
    )

    const result = await searchProducts(client, query())

    expect(result.novaDistribution).toEqual({ 4: 31 })
    expect(result.novaClassifiedCount).toBe(31)
  })

  it('reports none rather than throwing when upstream omits the facet', async () => {
    const result = await searchProducts(stubClient(upstreamResponse({ facets: {} })), query())

    expect(result.novaClassifiedCount).toBe(0)
  })
})
