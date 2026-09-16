import { describe, expect, it, vi } from 'vitest'
import { suggestTaxonomy } from '~~/server/services/suggest'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/**
 * Upstream ranks a multi-taxonomy call globally, so the highest-scoring taxonomy
 * fills the response: "choc" comes back as eight brands and no category.
 */

/** Answers each taxonomy with its own list, and records every call. */
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
    // Concatenating would put every category above every brand, and the reader
    // would see one taxonomy until they scrolled.
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
    // Keeping both would show the reader one entry twice, and the two copies
    // would apply different filters.
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
    // The spare is what lets the others fill the list when one comes up short.
    // Asking each for the full limit would multiply the load on the endpoint
    // with upstream's tightest published ceiling.
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
    // Substituting the default would be worse than answering with nothing: the
    // caller asked for something specific and would get categories back with
    // no signal that their request was discarded.
    const { client, get } = stubClient({ category: ['en:a'], brand: ['en:b'] })

    expect(await suggestTaxonomy(client, { q: 'ch', taxonomy: 'category,nonsense' })).toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  /**
   * Too short is not an error, it is an input someone has just started typing
   * into. A 400 would put a red line in the console on every first keystroke.
   */
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
    // A suggestion list is an enhancement. An empty dropdown is a better
    // outcome than a failed page, and a contract change still surfaces in the
    // search route, which does throw.
    const get = vi.fn().mockResolvedValue({ unexpected: true })

    expect(await suggestTaxonomy({ get } as UpstreamClient, { q: 'ch' })).toEqual([])
  })
})
