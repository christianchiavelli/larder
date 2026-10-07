import { expect, test } from '@playwright/test'

const PHOTOS = 'https://images.openfoodfacts.org'
const PRODUCT = '/products/3017620425035'

test.describe('the catalogue’s photos', () => {
  for (const path of ['/', '/products', PRODUCT]) {
    test(`are connected to as the head arrives, on ${path}`, async ({ page }) => {
      await page.goto(path)

      await expect(page.locator(`head link[rel="preconnect"][href="${PHOTOS}"]`)).toHaveCount(1)
    })
  }

  test('are not connected to on a page that shows none', async ({ page }) => {
    await page.goto('/overview')

    await expect(page.locator(`head link[rel="preconnect"][href="${PHOTOS}"]`)).toHaveCount(0)
  })

  test('put a product page’s own photo first in line', async ({ page }) => {
    await page.goto(PRODUCT)

    await expect(page.locator('main header img')).toHaveAttribute('fetchpriority', 'high')
  })
})
