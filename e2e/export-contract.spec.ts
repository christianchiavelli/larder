import { expect, test, type APIRequestContext } from '@playwright/test'
import { parseCsv } from '../test/support/csv'

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
  expect(text.startsWith('﻿')).toBe(true)

  const [header, ...records] = parseCsv(text.slice(1))
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

  test('opens with the header and gives every record the same width', async ({ request }) => {
    const { header, records } = await csv(request, '/api/products.csv?brand=nutella')

    expect(header).toEqual(HEADER)
    expect(records.length).toBeGreaterThan(0)
    for (const record of records) expect(record).toHaveLength(HEADER.length)
  })

  test('reads past the first upstream page without repeating a product', async ({ request }) => {
    test.setTimeout(90_000)

    const { records } = await csv(request, '/api/products.csv?category=en:hazelnut-spreads')
    const barcodes = records.map((record) => record[0])

    expect(records.length, 'the result no longer spans two pages').toBeGreaterThan(1_000)
    expect(new Set(barcodes).size, 'a product appeared twice').toBe(barcodes.length)
  })

  test('stops at the last row the upstream will page to, and not before', async ({ request }) => {
    test.setTimeout(180_000)

    const { records } = await csv(request, '/api/products.csv?nutriScore=a')

    expect(records).toHaveLength(10_000)
  })

  test('exports a search with no matches as a header and nothing else', async ({ request }) => {
    const { header, records } = await csv(request, '/api/products.csv?q=qzxvqzxvqzxv')

    expect(header).toEqual(HEADER)
    expect(records).toEqual([])
  })
})
