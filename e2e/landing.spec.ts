import { expect, test } from '@playwright/test'

test.describe('the landing page', () => {
  test('renders on the server, before any JavaScript runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Most scanned' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Graded A/ })).toBeVisible()

    await context.close()
  })

  test('hands the search term to the directory', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('searchbox', { name: 'Search the catalogue' }).fill('chocolate')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/\/products\?q=chocolate/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  test('submits from the keyboard', async ({ page }) => {
    await page.goto('/')

    const box = page.getByRole('searchbox', { name: 'Search the catalogue' })
    await box.fill('chocolate')
    await box.press('Enter')

    await expect(page).toHaveURL(/\/products\?q=chocolate/)
  })

  test('opens the directory unfiltered when nothing was typed', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/\/products$/)
  })

  for (const [label, expected] of [
    ['Graded A', /nutriScore=a/],
    ['Ultra-processed', /nova=4/],
    ['No grade on record', /nutriScore=unknown/],
  ] as const) {
    test(`the ${label} example returns products`, async ({ page }) => {
      await page.goto('/')

      await page.getByRole('link', { name: new RegExp(label) }).click()

      await expect(page).toHaveURL(expected)
      await expect(page.getByTestId('product-row').first()).toBeVisible()
    })
  }

  test('each example states its own size', async ({ page }) => {
    await page.goto('/')

    const counts = page.locator('li a [data-numeric]')

    await expect(counts).toHaveCount(3)
    for (const text of await counts.allInnerTexts()) {
      expect(text).toMatch(/\d/)
    }
  })

  test('opens a product from the grid', async ({ page }) => {
    await page.goto('/')

    const first = page.locator('li a[href^="/products/"]').first()
    const href = await first.getAttribute('href')
    await first.click()

    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  test('states the size of the catalogue from the data', async ({ page }) => {
    await page.goto('/')

    const size = page.locator('h1 + p [data-numeric]')

    await expect(size).toBeVisible()
    expect(await size.innerText()).toMatch(/^[\d,]{7,}$/)
  })
})
