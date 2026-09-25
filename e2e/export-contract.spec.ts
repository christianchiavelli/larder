import { expect, test, type APIRequestContext } from '@playwright/test'
import { parse } from 'csv-parse/sync'

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

async function csv(request: APIRequestContext, url: string) {
  const response = await request.get(url)
  expect(response.ok(), `${url} answered ${response.status()}`).toBe(true)

  const text = await response.text()
  expect(text.startsWith('\uFEFF')).toBe(true)

  const [header, ...records] = parse(text, { bom: true })
  return { response, header, records }
}

test.describe('the CSV export', () => {
  test('is a download rather than a page, and says what it holds', async ({ request }) => {
    const { response } = await csv(request, '/api/products.csv?brand=nutella')
    const headers = response.headers()

    expect(headers['content-type']).toBe('text/csv; charset=utf-8; header=present')
    expect(headers['content-disposition']).toBe('attachment; filename="larder-products.csv"')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('is streamed, not assembled in memory first', async ({ request }) => {
    const { response } = await csv(request, '/api/products.csv?brand=nutella')

    expect(response.headers()['transfer-encoding']).toBe('chunked')
    expect(response.headers()['content-length']).toBeUndefined()
  })

  test('opens with the header, in a file a strict parser reads to the end', async ({ request }) => {
    const { header, records } = await csv(request, '/api/products.csv?brand=nutella')

    expect(header).toEqual(HEADER)
    expect(records.length).toBeGreaterThan(0)
  })

  test('reads past the first upstream page, writing every product the count promised once', async ({
    request,
  }) => {
    test.setTimeout(90_000)

    const counted = await request.get('/api/products/count?category=en:hazelnut-spreads')
    const { totalCount, isTotalExact } = await counted.json()
    expect(isTotalExact, 'the category no longer fits in one export').toBe(true)

    const { records } = await csv(request, '/api/products.csv?category=en:hazelnut-spreads')
    const barcodes = records.map((record) => record[0])

    expect(records.length, 'the result no longer spans two pages').toBeGreaterThan(1_000)
    expect(records).toHaveLength(totalCount)
    expect(new Set(barcodes).size, 'a product appeared twice').toBe(barcodes.length)
  })

  test('refuses a search too big for one file before it sends a single row', async ({
    request,
  }) => {
    const response = await request.get('/api/products.csv?nutriScore=a')

    expect(response.status()).toBe(422)
    expect(response.headers()['content-disposition']).toBeUndefined()
    expect(await response.json()).toMatchObject({
      statusCode: 422,
      data: { reason: 'too_many_results', limit: 10_000 },
    })
  })

  test('exports a search with no matches as a header and nothing else', async ({ request }) => {
    const { header, records } = await csv(request, '/api/products.csv?q=qzxvqzxvqzxv')

    expect(header).toEqual(HEADER)
    expect(records).toEqual([])
  })
})

test.describe('the product count', () => {
  test('is exact for a search that fits in one export', async ({ request }) => {
    const response = await request.get('/api/products/count?brand=nutella')

    expect(response.ok()).toBe(true)
    const count = await response.json()
    expect(count.isTotalExact).toBe(true)
    expect(count.totalCount).toBeGreaterThan(0)
    expect(count.totalCount).toBeLessThanOrEqual(10_000)
  })

  test('says so when the upstream stops counting', async ({ request }) => {
    const response = await request.get('/api/products/count?nutriScore=a')

    expect(await response.json()).toEqual({ totalCount: 10_000, isTotalExact: false })
  })

  test('counts nothing for a search with no matches', async ({ request }) => {
    const response = await request.get('/api/products/count?q=qzxvqzxvqzxv')

    expect(await response.json()).toEqual({ totalCount: 0, isTotalExact: true })
  })
})

test.describe('the values of one dimension', () => {
  test('are the ones the search holds, most products first', async ({ request }) => {
    const response = await request.get('/api/products/facets/country?q=chocolate')

    expect(response.ok()).toBe(true)
    const values: { key: string; label: string; count: number }[] = await response.json()
    expect(values.length).toBeGreaterThan(1)
    expect(values.every((value) => value.key && value.label && value.count > 0)).toBe(true)
    expect(values.map((value) => value.count)).toEqual(
      [...values.map((value) => value.count)].sort((a, b) => b - a),
    )
    expect(values.some((value) => value.key.startsWith('--'))).toBe(false)
  })

  test('name countries the way people write them, not by the facet synonym', async ({
    request,
  }) => {
    const response = await request.get('/api/products/facets/country?q=chocolate')
    const labels = ((await response.json()) as { label: string }[]).map((value) => value.label)

    expect(labels).toEqual(expect.arrayContaining(['France', 'United States']))
    expect(labels).not.toContain('FRA')
    expect(labels).not.toContain('U.S.')
  })

  test('give the directory filters the same country names', async ({ request }) => {
    const response = await request.get('/api/products?q=chocolate')
    const { facets } = (await response.json()) as {
      facets: { countries_tags?: { label: string }[] }
    }
    const labels = (facets.countries_tags ?? []).map((value) => value.label)

    expect(labels).toContain('France')
    expect(labels).not.toContain('FRA')
  })

  test('answer a dimension that does not exist with a 404', async ({ request }) => {
    const response = await request.get('/api/products/facets/additive')

    expect(response.status()).toBe(404)
  })
})
