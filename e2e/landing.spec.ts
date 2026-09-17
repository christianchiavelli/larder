import { expect, test } from '@playwright/test'

/**
 * The front page is three ways into the catalogue, and each one is a claim
 * about what the app can do. A link that applies nothing still looks correct:
 * the directory opens, rows come back, and only the count is wrong.
 */

test.describe('the landing page', () => {
  test('renders on the server, before any JavaScript runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Larder', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Most scanned' })).toBeVisible()

    await context.close()
  })

  test('hands the search term to the directory', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('searchbox', { name: 'Search the catalogue' }).fill('chocolate')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/\/products\?q=chocolate/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  /**
   * Enter, not only the button. A search box is typed into and submitted from
   * the keyboard far more often than it is clicked, and the implicit submit is
   * the browser's behaviour rather than anything this page wires up: it is
   * exactly the kind of thing a stray `type="button"` or a `@keydown.prevent`
   * switches off with the button still working.
   */
  test('submits from the keyboard', async ({ page }) => {
    await page.goto('/')

    const box = page.getByRole('searchbox', { name: 'Search the catalogue' })
    await box.fill('chocolate')
    await box.press('Enter')

    await expect(page).toHaveURL(/\/products\?q=chocolate/)
  })

  /** An empty term is a request for the whole catalogue, not for `?q=`. */
  test('opens the directory unfiltered when nothing was typed', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/\/products$/)
  })

  /**
   * Each example is asserted on its effect rather than on the URL it points at.
   * A filter that reaches the index in the wrong vocabulary applies cleanly and
   * matches nothing, which is the failure this catalogue keeps producing.
   */
  for (const [label, expected] of [
    ['Nutri-Score A', /nutriScore=a/],
    ['Ultra-processed', /nova=4/],
    ['No grade on record', /nutriScore=unknown/],
  ] as const) {
    test(`the ${label} example returns products`, async ({ page }) => {
      await page.goto('/')

      await page.getByRole('link', { name: label, exact: true }).click()

      await expect(page).toHaveURL(expected)
      await expect(page.getByTestId('product-row').first()).toBeVisible()
    })
  }

  test('opens a product from the grid', async ({ page }) => {
    await page.goto('/')

    const first = page.locator('li a[href^="/products/"]').first()
    const href = await first.getAttribute('href')
    await first.click()

    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  /** The figures are the only reason to render the line at all. */
  test('states the size of the catalogue', async ({ page }) => {
    await page.goto('/')

    const figures = page.locator('[data-numeric]')
    await expect(figures.first()).toBeVisible()
    expect(await figures.count()).toBe(3)
  })
})
