import { readFile } from 'node:fs/promises'
import { expect, test, type Download, type Page } from '@playwright/test'
import { parseCsv } from '../test/support/csv'

async function records(download: Download) {
  const text = await readFile(await download.path(), 'utf8')
  expect(text.startsWith('﻿'), 'the file has no UTF-8 byte order mark').toBe(true)

  const [header, ...rows] = parseCsv(text.slice(1))
  return rows.map((row) => Object.fromEntries(header!.map((name, index) => [name, row[index]])))
}

async function exportFrom(page: Page, name: string | RegExp = 'Export CSV') {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name }).click(),
  ])
  return download
}

test.describe('exporting the directory', () => {
  test('downloads the products the directory is filtered to', async ({ page }) => {
    await page.goto('/products?brand=nutella')

    await page
      .getByRole('button', { name: /Nutri-Score E,/ })
      .first()
      .click()
    await expect(page).toHaveURL(/nutriScore=e/)

    const download = await exportFrom(page)
    expect(download.suggestedFilename()).toBe('larder-products.csv')

    const rows = await records(download)
    expect(rows.length).toBeGreaterThan(0)
    expect(
      rows.map((row) => row['Nutri-Score']),
      'a row came back that is not grade e',
    ).toEqual(rows.map(() => 'e'))
  })

  test('works before any JavaScript runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/products?brand=nutella&nutriScore=e')

    const rows = await records(await exportFrom(page))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row['Nutri-Score'] === 'e')).toBe(true)

    await context.close()
  })

  test('holds the export back while the list still shows the previous filter', async ({ page }) => {
    await page.goto('/products?brand=nutella')

    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(
      (url) => url.pathname === '/api/products',
      async (route) => {
        await held
        await route.continue()
      },
    )

    const link = page.getByRole('link', { name: 'Export CSV' })
    await expect(link).toHaveAttribute('href', '/api/products.csv?brand=nutella')

    await page
      .getByRole('button', { name: /Nutri-Score E,/ })
      .first()
      .click()
    await expect(page).toHaveURL(/nutriScore=e/)

    await expect(link).toHaveAttribute('aria-disabled', 'true')
    await expect(link).not.toHaveAttribute('href')

    release()

    await expect(link).toHaveAttribute('href', '/api/products.csv?brand=nutella&nutriScore=e')
    await expect(link).not.toHaveAttribute('aria-disabled')
  })

  test('says so when the file will stop short of the total', async ({ page }) => {
    await page.goto('/products')

    await expect(page.getByTestId('result-summary')).toContainText('10,000+')
    await expect(page.getByRole('link', { name: 'Export first 10,000 as CSV' })).toHaveAttribute(
      'href',
      '/api/products.csv',
    )
  })

  test('leaves the page number behind and keeps the sort', async ({ page }) => {
    await page.goto('/products?brand=nutella&sort=popularity&page=2&pageSize=48')

    await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'href',
      '/api/products.csv?brand=nutella&sort=popularity',
    )
  })

  test('offers nothing to export when nothing matches', async ({ page }) => {
    await page.goto('/products?q=qzxvqzxvqzxv')

    await expect(page.getByText('No products match these filters')).toBeVisible()
    await expect(page.getByRole('link', { name: /Export/ })).toHaveCount(0)
  })
})
