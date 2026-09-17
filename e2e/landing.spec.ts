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

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Most scanned' })).toBeVisible()
    // The examples are links, so they work before hydration like anything else.
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

  /**
   * Each card states how many products its filter returns, which is the whole
   * reason it is a card rather than a pill. A count that never arrives leaves
   * three cards promising something instead of describing it.
   */
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

  /** The headline claim is a measured figure, not a rounded one in the copy. */
  test('states the size of the catalogue from the data', async ({ page }) => {
    await page.goto('/')

    const size = page.locator('h1 + p [data-numeric]')

    await expect(size).toBeVisible()
    // Six digits at least: the placeholder the copy falls back to is "3.5
    // million", which would pass a looser check while stating nothing measured.
    expect(await size.innerText()).toMatch(/^[\d,]{7,}$/)
  })
})
