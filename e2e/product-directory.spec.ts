import { expect, test, type Page } from '@playwright/test'

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
    await expect(page.getByTestId('product-row').first()).toBeVisible()

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

  /**
   * Removing a filter, which is a different operation from applying one.
   *
   * The URL writer merged two serialised queries, and the serialiser omits
   * anything at its default, so a patch that emptied a dimension simply had no
   * key for it and the previous value survived the merge. Applying a filter
   * worked; switching it off did nothing, and neither did Clear all. Every
   * existing test here applied a filter, so the whole suite was green.
   */
  test('switches a filter back off again', async ({ page }) => {
    await page.goto('/products')

    const grade = page.getByRole('button', { name: /Nutri-Score A,/ }).first()

    await grade.click()
    await expect(page).toHaveURL(/nutriScore=a/)

    await grade.click()
    await expect(page).not.toHaveURL(/nutriScore/)
    await expect(grade).toHaveAttribute('aria-pressed', 'false')
  })

  test('clears every filter at once', async ({ page }) => {
    await page.goto('/products?nutriScore=a&nova=4&sort=popularity')

    await page.getByRole('button', { name: /clear all/i }).click()

    await expect(page).not.toHaveURL(/nutriScore|nova/)
    // Sort is how the user chose to read the list, not what they chose to look
    // at, so clearing the filters must not reset it.
    await expect(page).toHaveURL(/sort=popularity/)
  })

  /**
   * The two ungraded buckets, which together are most of the catalogue.
   *
   * Neither was reachable at first: the schema dropped the value, and a dropped
   * filter narrows nothing, so the page answered with everything. Then they
   * were one control that selected both, which was worse in a quieter way, as
   * it is impossible to tell a product nobody has graded from a beer the scheme
   * will never grade. Each is asserted on its own here for that reason.
   */
  for (const { label, value } of [
    { label: 'Nutri-Score not reported', value: 'unknown' },
    { label: 'Nutri-Score not applicable', value: 'not-applicable' },
  ]) {
    test(`filters to the products marked ${value}`, async ({ page }) => {
      await page.goto('/products')

      await page.getByRole('button', { name: label }).first().click()
      await expect(page).toHaveURL(new RegExp(`nutriScore=${value}`))

      /*
       * Polled rather than read once. The directory holds the previous page on
       * screen while the next one loads, which is deliberate and means a single
       * read lands on the rows from before the filter was applied.
       */
      const rows = page.getByTestId('product-row')
      const matching = rows.getByRole('img', { name: label })

      await expect(rows.first()).toBeVisible()
      await expect
        .poll(async () => {
          const [total, absent] = await Promise.all([rows.count(), matching.count()])
          return total > 0 && total === absent
        })
        .toBe(true)
    })
  }

  test('restores state from a pasted link without visiting the page first', async ({ page }) => {
    await page.goto('/products?nutriScore=a&sort=popularity')

    await expect(page.getByLabel('Sort')).toHaveValue('popularity')
    await expect(page.getByRole('button', { name: /Nutri-Score A,/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  /**
   * The page size was reachable only by editing the address bar: the schema
   * validated it, the composable reset to page one on a change, and nothing
   * rendered a control.
   */
  test('changes the page size and starts again from page one', async ({ page }) => {
    await page.goto('/products?page=5')

    await page.getByLabel('Per page').selectOption('48')

    await expect(page).toHaveURL(/pageSize=48/)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await expect(page.getByTestId('product-row')).toHaveCount(48)
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

    // Addressed by test id rather than by tag: whether a result is a card or a
    // row is a layout decision, and a spec about navigation should survive it.
    const firstProduct = page.getByTestId('product-row').first().locator('h3 a')
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

test.describe('filter suggestions', () => {
  /**
   * The search box is a combobox whose listbox offers filters, not search
   * terms. Driven here with real key events, because the whole point of the
   * pattern is the keyboard: the active option is pointed at rather than
   * focused, so focus never leaves the input and typing keeps working while
   * the list is open. None of that is observable without a browser.
   */
  const search = (page: Page) => page.getByRole('combobox', { name: 'Search products' })

  test('suggests taxonomy filters once the term is long enough', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    // One character matches most of a taxonomy, so the service declines to
    // call upstream and the listbox stays shut.
    await input.fill('c')
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    await input.fill('choc')
    await expect(page.getByRole('listbox', { name: 'Filter suggestions' })).toBeVisible()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(await page.getByRole('option').count()).toBeGreaterThan(0)
  })

  test('mixes taxonomies instead of showing one of them', async ({ page }) => {
    // Upstream ranks a multi-taxonomy request globally, so asking it for
    // categories and brands together returns brands only. The service issues
    // one call per taxonomy and interleaves, and this is the visible result.
    await page.goto('/products')
    await search(page).fill('choc')

    await expect(page.getByRole('listbox')).toBeVisible()

    const kinds = await page
      .getByRole('option')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim().split(/\s+/).at(-1)))

    expect(new Set(kinds).size).toBeGreaterThan(1)
  })

  test('applies a suggestion as a filter, by keyboard', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await input.fill('choc')
    await expect(page.getByRole('listbox')).toBeVisible()

    await input.press('ArrowDown')
    await expect(input).toHaveAttribute('aria-activedescendant', /option-0$/)

    await input.press('Enter')

    // Some filter dimension now carries a taxonomy id, and the term that was
    // only ever typed in order to find it is gone.
    await expect(page).toHaveURL(/(category|brand|country|label)=/)
    await expect(page).not.toHaveURL(/[?&]q=/)
    await expect(input).toHaveValue('')

    // And it matches something. Asserting only the URL is how a suggestion that
    // applied a filter upstream could not understand passed as working: the
    // address bar was right and the catalogue came back empty.
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  /**
   * Brands specifically, because they are the dimension upstream stores
   * differently: the facet returns a bare slug and autocomplete returns the
   * same brand with a language prefix.
   */
  test('applies a brand suggestion to a dimension that matches', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await input.fill('olivari')
    await expect(page.getByRole('listbox')).toBeVisible()

    const brand = page.getByRole('option').filter({ hasText: 'Brand' }).first()
    await brand.click()

    await expect(page).toHaveURL(/brand=/)
    await expect(page).not.toHaveURL(/brand=en(%3A|:)/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  test('applies a suggestion by pointer', async ({ page }) => {
    await page.goto('/products')

    await search(page).fill('choc')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.getByRole('option').first().click()

    await expect(page).toHaveURL(/(category|brand|country|label)=/)
  })

  test('closes on Escape without applying anything', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await input.fill('choc')
    await expect(page.getByRole('listbox')).toBeVisible()

    await input.press('Escape')

    await expect(input).toHaveAttribute('aria-expanded', 'false')
    // The term survives: Escape dismisses the suggestions, it does not undo
    // the search the reader is in the middle of typing.
    await expect(input).toHaveValue('choc')
  })

  test('leaves Enter to the free-text search when nothing is highlighted', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await input.fill('choc')
    await expect(page.getByRole('listbox')).toBeVisible()

    await input.press('Enter')

    await expect(page).toHaveURL(/q=choc/)
    await expect(page).not.toHaveURL(/(category|brand|country|label)=/)
  })
})
