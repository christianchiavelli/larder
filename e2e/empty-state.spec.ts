import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { transitionsSettled } from './support/motion'

const NOTHING_MATCHES = '/products?q=qzxvqzxvqzxv'
const TITLE = 'No products match these filters'

test.describe('when a search matches nothing', () => {
  test('the directory says so with its own illustration', async ({ page }) => {
    await page.goto(NOTHING_MATCHES)

    const status = page.getByRole('status').filter({ hasText: TITLE })
    await expect(status.getByRole('heading', { name: TITLE })).toBeVisible()
    await expect(status.getByTestId('empty-illustration')).toBeVisible()
  })

  test('clearing the filters from there brings the products back', async ({ page }) => {
    await page.goto(NOTHING_MATCHES)

    await page.getByRole('button', { name: 'Clear all filters' }).click()

    await expect(page).not.toHaveURL(/q=/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  test('leaves out the paging, since there is nothing to page through', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByText('Per page')).toBeVisible()

    await page.goto(NOTHING_MATCHES)

    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
    await expect(page.getByText('Per page')).toBeHidden()
  })

  test('passes an accessibility scan', async ({ page }) => {
    await page.goto(NOTHING_MATCHES)
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
    await transitionsSettled(page)

    const scan = await new AxeBuilder({ page }).include('[role="status"]').analyze()
    expect(scan.violations).toEqual([])
  })
})

test('a barcode nobody registered gets the same illustration', async ({ page }) => {
  await page.goto('/products/00000000000001')

  await expect(page.getByTestId('empty-illustration')).toBeVisible()
})
