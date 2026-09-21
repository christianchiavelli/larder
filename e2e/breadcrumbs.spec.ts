import { expect, test } from '@playwright/test'

const PRODUCT = '/products/3017620425035'

test.describe('breadcrumbs', () => {
  test('is a labelled landmark, not a row of links', async ({ page }) => {
    await page.goto(PRODUCT)

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(trail).toBeVisible()
    await expect(trail.getByRole('listitem')).toHaveCount(2)
  })

  test('marks the current page and leaves it unlinked', async ({ page }) => {
    await page.goto(PRODUCT)

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
    const current = trail.locator('[aria-current="page"]')

    await expect(current).toBeVisible()
    await expect(current).not.toHaveRole('link')

    await expect(trail.getByRole('link')).toHaveCount(1)
  })

  test('carries the product name once it arrives', async ({ page }) => {
    await page.goto(PRODUCT)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).not.toHaveText('Product')

    const current = page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current]')
    await expect(current).toHaveText(await heading.innerText())
  })

  test('steps back up to the directory', async ({ page }) => {
    await page.goto(PRODUCT)

    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').click()

    await expect(page).toHaveURL(/\/products$/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  test('shows the directory above a product reached from the front page', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href^="/products/"]').first().click()

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(trail.getByRole('link')).toHaveText('Products')
  })

  test('separates the link from the current page by weight, not only colour', async ({ page }) => {
    await page.goto(PRODUCT)

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
    const weight = (locator: ReturnType<typeof trail.locator>) =>
      locator.evaluate((element) => Number(getComputedStyle(element).fontWeight))

    const linkWeight = await weight(trail.getByRole('link'))
    const currentWeight = await weight(trail.locator('[aria-current="page"]'))

    expect(currentWeight).toBeGreaterThan(linkWeight)
  })

  test('clips the current page rather than the link, on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(PRODUCT)

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
    const link = trail.getByRole('link')
    const current = trail.locator('[aria-current="page"]')

    const clipped = (locator: typeof link) =>
      locator.evaluate((element) => element.scrollWidth > element.clientWidth + 1)

    expect(await clipped(link), 'the link was clipped').toBe(false)
    await expect(current).toBeVisible()
  })
})
