import { describe, expect, it, vi } from 'vitest'
import { suggestTaxonomy } from '~~/server/services/suggest'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

function stubClient(byTaxonomy: Record<string, string[]>) {
  const get = vi.fn(async (_path: string, query?: Record<string, unknown>) => {
    const taxonomy = String(query?.taxonomy_names ?? '')
    const size = Number(query?.size ?? 10)
    return {
      options: (byTaxonomy[taxonomy] ?? [])
        .slice(0, size)
        .map((id) => ({ id, text: null, taxonomy_name: taxonomy })),
    }
  })

  return { client: { get } as UpstreamClient, get }
}

describe('suggestTaxonomy', () => {
  it('asks each taxonomy separately', async () => {
    const { client, get } = stubClient({ category: ['en:a'], brand: ['en:b'] })

    await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,brand' })

    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls.map((call) => call[1]?.taxonomy_names)).toEqual(['category', 'brand'])
  })

  it('takes one from each list in turn', async () => {
    const { client } = stubClient({
      category: ['en:cat-1', 'en:cat-2', 'en:cat-3'],
      brand: ['en:brand-1', 'en:brand-2'],
    })

    const suggestions = await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,brand' })

    expect(suggestions.map((s) => s.id)).toEqual([
      'en:cat-1',
      'en:brand-1',
      'en:cat-2',
      'en:brand-2',
      'en:cat-3',
    ])
  })

  it('keeps going when one taxonomy runs out', async () => {
    const { client } = stubClient({ category: ['en:cat-1', 'en:cat-2', 'en:cat-3'], brand: [] })

    const suggestions = await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,brand' })

    expect(suggestions.map((s) => s.id)).toEqual(['en:cat-1', 'en:cat-2', 'en:cat-3'])
  })

  it('shows an id once when two taxonomies both return it', async () => {
    const { client } = stubClient({ category: ['en:same'], brand: ['en:same'] })

    const suggestions = await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,brand' })

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!.taxonomy).toBe('category')
  })

  it('never returns more than the limit', async () => {
    const { client } = stubClient({
      category: ['en:c1', 'en:c2', 'en:c3', 'en:c4'],
      brand: ['en:b1', 'en:b2', 'en:b3', 'en:b4'],
    })

    const suggestions = await suggestTaxonomy(client, {
      q: 'ch',
      taxonomy: 'category,brand',
      limit: 3,
    })

    expect(suggestions).toHaveLength(3)
  })

  it('asks each taxonomy for its share plus one, not for the whole limit', async () => {
    const { client, get } = stubClient({ category: [], brand: [] })

    await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,brand', limit: 8 })

    expect(get.mock.calls.map((call) => call[1]?.size)).toEqual([5, 5])
  })

  it('defaults to categories and brands', async () => {
    const { client, get } = stubClient({ category: ['en:a'], brand: ['en:b'] })

    await suggestTaxonomy(client, { q: 'ch' })

    expect(get.mock.calls.map((call) => call[1]?.taxonomy_names)).toEqual(['category', 'brand'])
  })

  it('accepts a repeated parameter as well as a comma-joined one', async () => {
    const { client, get } = stubClient({ category: ['en:a'], label: ['en:l'] })

    await suggestTaxonomy(client, { q: 'ch', taxonomy: ['category', 'label'] })

    expect(get.mock.calls.map((call) => call[1]?.taxonomy_names)).toEqual(['category', 'label'])
  })

  it('rejects an unknown taxonomy rather than forwarding it', async () => {
    const { client, get } = stubClient({ category: ['en:a'], brand: ['en:b'] })

    expect(await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,nonsense' })).toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  it.each([[''], ['c'], ['  ']])('answers %j locally without calling upstream', async (q) => {
    const { client, get } = stubClient({ category: ['en:a'] })

    await expect(suggestTaxonomy(client, { q })).resolves.toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  it('uses the label upstream sends when there is one', async () => {
    const get = vi.fn().mockResolvedValue({
      options: [
        { id: 'en:chocolate-biscuits', text: 'Chocolate biscuits', taxonomy_name: 'category' },
      ],
    })

    const suggestions = await suggestTaxonomy({ get } as UpstreamClient, {
      q: 'choc',
      taxonomy: 'category',
    })

    expect(suggestions[0]).toEqual({
      id: 'en:chocolate-biscuits',
      label: 'Chocolate biscuits',
      taxonomy: 'category',
    })
  })

  it('names a suggested country the same way the country facet does', async () => {
    const get = vi.fn().mockResolvedValue({
      options: [{ id: 'en:united-states', text: 'USA', taxonomy_name: 'country' }],
    })

    const suggestions = await suggestTaxonomy({ get } as UpstreamClient, {
      q: 'us',
      taxonomy: 'country',
    })

    expect(suggestions[0]!.label).toBe('United States')
  })

  it('surfaces a transport failure, unlike a shape mismatch', async () => {
    const get = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('down'), { response: { status: 503 } }))

    await expect(suggestTaxonomy({ get } as UpstreamClient, { q: 'choc' })).rejects.toMatchObject({
      statusCode: 502,
    })
  })

  it('derives a label from the id when upstream sends none', async () => {
    const { client } = stubClient({ category: ['en:olive-oils-from-corsica'] })

    const suggestions = await suggestTaxonomy(client, { q: 'olive', taxonomy: 'category' })

    expect(suggestions[0]!.label).toBe('Olive oils from corsica')
  })

  it('survives an upstream response in an unexpected shape', async () => {
    const get = vi.fn().mockResolvedValue({ unexpected: true })

    expect(await suggestTaxonomy({ get } as UpstreamClient, { q: 'ch' })).toEqual([])
  })
})
