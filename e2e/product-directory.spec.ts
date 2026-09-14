import { expect, test } from '@playwright/test'

/**
 * Directory behaviour, end to end.
 *
 * These assertions deliberately avoid depending on specific products. The
 * catalogue is community-edited and changes daily, so a test asserting that
 * Nutella is on page one would fail for reasons that are not regressions. What
 * is asserted instead are the invariants: that filter state lives in the URL,
 * that it survives a reload, and that the page never claims a number it cannot
 * support.
 */

test.describe('product directory', () => {
  test('renders results on the server, before any JavaScript runs', async ({ browser }) => {
    // JavaScript disabled, so anything visible here came from SSR. This is the
    // difference between a server-rendered app and a client app behind a
    // loading spinner, and it is not visible in a normal browser test.
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/products')

    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible()
    await expect(page.locator('article').first()).toBeVisible()

    await context.close()
  })

  test('puts filter state in the URL and restores it on reload', async ({ page }) => {
    await page.goto('/products')

    await page
      .getByRole('button', { name: /Nutri-Score A,/ })
      .first()
      .click()
    await expect(page).toHaveURL(/nutriScore=a/)

    // A reload has to reproduce the same view. That is the whole claim behind
    // keeping state in the URL rather than in a store.
    await page.reload()
    await expect(page).toHaveURL(/nutriScore=a/)
    await expect(page.getByRole('button', { name: /Nutri-Score A,/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('restores state from a pasted link without visiting the page first', async ({ page }) => {
    await page.goto('/products?nutriScore=a&sort=popularity')

    await expect(page.getByLabel('Sort')).toHaveValue('popularity')
    await expect(page.getByRole('button', { name: /Nutri-Score A,/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('supports the back button', async ({ page }) => {
    await page.goto('/products')

    await page
      .getByRole('button', { name: /Nutri-Score A,/ })
      .first()
      .click()
    await expect(page).toHaveURL(/nutriScore=a/)

    await page.goBack()
    await expect(page).not.toHaveURL(/nutriScore=a/)
  })

  /**
   * Upstream stops counting at 10,000 and pins the figure there. Printing it
   * as an exact total would state a number known to be wrong.
   */
  test('marks an approximate total as approximate', async ({ page }) => {
    await page.goto('/products')

    // Scoped by test id: NuxtRouteAnnouncer is also aria-live polite, so the
    // attribute alone matches two elements.
    const summary = page.getByTestId('result-summary')
    await expect(summary).toContainText(/\d/)

    const text = (await summary.textContent()) ?? ''
    if (text.includes('10,000')) {
      expect(text).toContain('+')
    }
  })

  test('recovers from a hand-edited URL instead of erroring', async ({ page }) => {
    // Every value here is invalid: a grade that does not exist, a NOVA group
    // out of range, an unknown sort, a page far past the ceiling. The schema
    // drops them and the page still renders.
    await page.goto('/products?nutriScore=z&nova=99&sort=by-vibes&page=999999')

    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Sort')).toHaveValue('relevance')
  })

  /**
   * Asserts the barcode, not the heading.
   *
   * The two upstream services disagree about product names, and not as a
   * staleness bug: barcode 3274080005003 is "Eau de source" in the search index
   * and "Cristaline" in the product API, with "isabelle" sitting in a third
   * field. A card and the page it opens are genuinely allowed to show different
   * names, so asserting they match would encode a guarantee the data does not
   * offer. What must hold is that the link goes to the product it claims.
   */
  test('navigates to the product the card links to', async ({ page }) => {
    await page.goto('/products')

    const firstProduct = page.locator('article h3 a').first()
    const href = await firstProduct.getAttribute('href')
    await firstProduct.click()

    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('reports a barcode that does not exist without breaking the page', async ({ page }) => {
    await page.goto('/products/00000000000001')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('logs no console errors during a normal session', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.goto('/products')
    await page
      .getByRole('button', { name: /Nutri-Score A,/ })
      .first()
      .click()
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})
