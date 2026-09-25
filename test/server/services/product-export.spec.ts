import { describe, expect, it, vi } from 'vitest'
import { EXPORT_PAGE_SIZE, openProductExport } from '~~/server/services/product-export'
import { MAX_TRACKED_HITS, productQuerySchema } from '#shared/domain/search'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'
import { parseCsv } from '../../support/csv'

const PRODUCT_BASE = 'https://world.openfoodfacts.org'

const query = (input: Record<string, unknown> = {}) => productQuerySchema.parse(input)

const HEADER = [
  'Barcode',
  'Name',
  'Brands',
  'Category',
  'Nutri-Score',
  'NOVA group',
  'Energy (kcal/100 g)',
  'Fat (g/100 g)',
  'Saturated fat (g/100 g)',
  'Carbohydrates (g/100 g)',
  'Sugars (g/100 g)',
  'Fibre (g/100 g)',
  'Protein (g/100 g)',
  'Salt (g/100 g)',
  'Sodium (g/100 g)',
  'Source',
]

function hit(code: string, overrides: Record<string, unknown> = {}) {
  return {
    code,
    product_name: `Product ${code}`,
    nutriscore_grade: 'b',
    nutriments: { sugars_100g: 5 },
    ...overrides,
  }
}

function response(hits: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    hits,
    count: hits.length,
    page: 1,
    page_size: EXPORT_PAGE_SIZE,
    page_count: 1,
    is_count_exact: true,
    ...overrides,
  }
}

type StubClient = UpstreamClient & { get: ReturnType<typeof vi.fn> }

function stubClient(...responses: unknown[]): StubClient {
  const get = vi.fn()
  for (const next of responses) get.mockResolvedValueOnce(next)
  return { get }
}

function catalogue(size: number): StubClient {
  const get = vi.fn(async (_path: string, params: Record<string, unknown>) => {
    const page = Number(params.page)
    const pageSize = Number(params.page_size)

    if (page * pageSize > MAX_TRACKED_HITS) {
      throw Object.assign(new Error('page * page_size exceeds 10 000'), {
        response: { status: 400 },
      })
    }

    const start = (page - 1) * pageSize
    const tracked = Math.min(size, MAX_TRACKED_HITS)
    const length = Math.max(0, Math.min(pageSize, size - start))

    return response(
      Array.from({ length }, (_, index) => hit(String(start + index + 1).padStart(13, '0'))),
      {
        count: tracked,
        page,
        page_size: pageSize,
        page_count: Math.ceil(tracked / pageSize),
        is_count_exact: size <= MAX_TRACKED_HITS,
      },
    )
  })

  return { get }
}

const open = (client: UpstreamClient, input: Record<string, unknown> = {}, signal?: AbortSignal) =>
  openProductExport(client, query(input), { productBase: PRODUCT_BASE, signal })

async function exported(client: UpstreamClient, input: Record<string, unknown> = {}) {
  const text = (await Array.fromAsync(await open(client, input))).join('')
  expect(text.startsWith('\uFEFF')).toBe(true)

  const [header, ...records] = parseCsv(text.slice(1))
  return { header, records }
}

const requestedPages = (client: StubClient) =>
  client.get.mock.calls.map(([, params]) => (params as { page: number }).page)

describe('openProductExport', () => {
  it('opens with a byte order mark and a header that names each unit', async () => {
    const { header } = await exported(stubClient(response([hit('1')])))

    expect(header).toEqual(HEADER)
  })

  it('writes one record per product, in the order of the header', async () => {
    const client = stubClient(
      response([
        {
          code: '3017620425035',
          product_name: 'Nutella',
          brands: ['Ferrero', 'Nutella'],
          categories_tags: ['en:spreads', 'en:cocoa-and-hazelnuts-spreads'],
          nutriscore_grade: 'e',
          nova_groups: 4,
          nutriments: {
            'energy-kcal_100g': 539,
            fat_100g: 30.9,
            'saturated-fat_100g': 10.6,
            carbohydrates_100g: 57.5,
            sugars_100g: 56.3,
            fiber_100g: 0,
            proteins_100g: 6.3,
            salt_100g: 0.107,
            sodium_100g: 0.0428,
          },
        },
      ]),
    )

    const { records } = await exported(client)

    expect(records).toEqual([
      [
        '3017620425035',
        'Nutella',
        'Ferrero, Nutella',
        'Cocoa and hazelnuts spreads',
        'e',
        '4',
        '539',
        '30.9',
        '10.6',
        '57.5',
        '56.3',
        '0',
        '6.3',
        '0.107',
        '0.0428',
        `${PRODUCT_BASE}/product/3017620425035`,
      ],
    ])
  })

  it('writes what nobody reported as an empty field, never as a zero', async () => {
    const client = stubClient(
      response([{ code: '42', nutriscore_grade: 'unknown', nutriments: { salt_100g: 1.2 } }]),
    )

    const [record] = (await exported(client)).records

    expect(record).toEqual([
      '42',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '1.2',
      '',
      `${PRODUCT_BASE}/product/42`,
    ])
  })

  it('keeps a product the Nutri-Score excludes apart from one nobody graded', async () => {
    const client = stubClient(
      response([
        hit('1', { nutriscore_grade: 'not-applicable' }),
        hit('2', { nutriscore_grade: 'unknown' }),
      ]),
    )

    const grades = (await exported(client)).records.map((record) => record[4])

    expect(grades).toEqual(['not-applicable', ''])
  })

  it('asks for pages of a thousand rows and none of the facets', async () => {
    const client = stubClient(response([hit('1')]))

    await open(client)

    const [path, params] = client.get.mock.calls[0]!
    expect(path).toBe('/search')
    expect(params.page_size).toBe(EXPORT_PAGE_SIZE)
    expect(params).not.toHaveProperty('facets')
    expect(String(params.fields)).toContain('nutriments')
    expect(String(params.fields)).not.toContain('image')
  })

  it('sends the same query and sort as the directory it was exported from', async () => {
    const input = { q: 'granola', category: 'en:biscuits', sort: 'nutriscore' }
    const client = stubClient(response([hit('1')]))

    await open(client, input)

    expect(client.get.mock.calls[0]![1]).toMatchObject(buildProductQuery(query(input)))
  })

  it('has the first page in hand before it returns, so a failure there can still be a status', async () => {
    const outage = Object.assign(new Error('boom'), { response: { status: 503 } })
    const client: UpstreamClient = { get: vi.fn().mockRejectedValue(outage) }

    await expect(open(client)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('asks the upstream for the next page only once the reader wants it', async () => {
    const client = catalogue(3_500)

    const csv = await open(client)
    expect(client.get).toHaveBeenCalledTimes(1)

    await csv.next()
    expect(client.get).toHaveBeenCalledTimes(1)

    await csv.next()
    expect(client.get).toHaveBeenCalledTimes(2)
  })

  it('reads every page of a result that fits under the ceiling', async () => {
    const client = catalogue(2_345)

    const { records } = await exported(client)

    expect(records).toHaveLength(2_345)
    expect(new Set(records.map((record) => record[0])).size).toBe(2_345)
    expect(requestedPages(client)).toEqual([1, 2, 3])
  })

  it('stops at the ceiling instead of asking for a page the upstream refuses', async () => {
    const client = catalogue(50_000)

    const { records } = await exported(client)

    expect(records).toHaveLength(MAX_TRACKED_HITS)
    expect(requestedPages(client)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('ends in an error rather than in silence when a later page fails', async () => {
    const fullPage = Array.from({ length: EXPORT_PAGE_SIZE }, (_, index) => hit(String(index)))
    const outage = Object.assign(new Error('boom'), { response: { status: 503 } })
    const client = stubClient(response(fullPage, { page_count: 4 }))
    client.get.mockRejectedValueOnce(outage)

    const csv = await open(client)

    expect((await csv.next()).done).toBe(false)
    await expect(csv.next()).rejects.toMatchObject({ statusCode: 502 })
  })

  it('hands the abort signal to every upstream request', async () => {
    const controller = new AbortController()
    const client = catalogue(2_500)

    await Array.fromAsync(await open(client, {}, controller.signal))

    expect(client.get).toHaveBeenCalledTimes(3)
    for (const [, , options] of client.get.mock.calls) {
      expect(options).toEqual({ signal: controller.signal })
    }
  })

  it('exports an empty result as a header and nothing else', async () => {
    const { header, records } = await exported(catalogue(0))

    expect(header).toEqual(HEADER)
    expect(records).toEqual([])
  })

  it('drops an unreadable row rather than the export', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = stubClient(response([hit('1'), { junk: true }, hit('2')]))

    const { records } = await exported(client)

    expect(records.map((record) => record[0])).toEqual(['1', '2'])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
