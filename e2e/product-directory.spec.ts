import { expect, test, type Page } from '@playwright/test'

test.describe('product directory', () => {
  test('renders results on the server, before any JavaScript runs', async ({ browser }) => {
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

    await page.reload()
    await expect(page).toHaveURL(/nutriScore=a/)
    await expect(page.getByRole('button', { name: /Nutri-Score A,/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

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
    await expect(page).toHaveURL(/sort=popularity/)
  })

  for (const { label, value } of [
    { label: 'Nutri-Score not reported', value: 'unknown' },
    { label: 'Nutri-Score not applicable', value: 'not-applicable' },
  ]) {
    test(`filters to the products marked ${value}`, async ({ page }) => {
      await page.goto('/products')

      await page.getByRole('button', { name: label }).first().click()
      await expect(page).toHaveURL(new RegExp(`nutriScore=${value}`))

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

  test('marks an approximate total as approximate', async ({ page }) => {
    await page.goto('/products')

    const summary = page.getByTestId('result-summary')
    await expect(summary).toContainText(/\d/)

    const text = (await summary.textContent()) ?? ''
    if (text.includes('10,000')) {
      expect(text).toContain('+')
    }
  })

  test('recovers from a hand-edited URL instead of erroring', async ({ page }) => {
    await page.goto('/products?nutriScore=z&nova=99&sort=by-vibes&page=999999')

    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Sort')).toHaveValue('relevance')
  })

  test('navigates to the product the card links to', async ({ page }) => {
    await page.goto('/products')

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
  const search = (page: Page) => page.getByRole('combobox', { name: 'Search products' })

  test('suggests taxonomy filters once the term is long enough', async ({ page }) => {
    await page.goto('/products')

    const input = search(page)
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    await input.fill('c')
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    await input.fill('choc')
    await expect(page.getByRole('listbox', { name: 'Filter suggestions' })).toBeVisible()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(await page.getByRole('option').count()).toBeGreaterThan(0)
  })

  test('mixes taxonomies instead of showing one of them', async ({ page }) => {
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

    await expect(page).toHaveURL(/(category|brand|country|label)=/)
    await expect(page).not.toHaveURL(/[?&]q=/)
    await expect(input).toHaveValue('')

    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

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

test.describe('the product page columns', () => {
  const CODE = '3017620425035'

  async function measure(page: Page) {
    return page.evaluate(() => {
      const card = (heading: string) =>
        [...document.querySelectorAll('h2')]
          .find((node) => node.textContent?.trim() === heading)
          ?.closest('div[class*="rounded-card"]') as HTMLElement | undefined

      const nutrition = card('Nutrition')!
      const composition = card('Composition')!
      const source = card('Source')!

      return {
        nutrition: nutrition.getBoundingClientRect().height,
        composition: composition.getBoundingClientRect().height,
        source: source.getBoundingClientRect().height,
        gap: parseFloat(getComputedStyle(composition.parentElement!).rowGap),
        declared: [nutrition, composition, source].map((el) => el.style.height).join(''),
      }
    })
  }

  test('the right column fills the height of the nutrition card', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/products/${CODE}`)
    await page.getByRole('heading', { name: 'Source' }).waitFor()

    const measured = await measure(page)

    expect(measured.declared, 'a height was hard-coded').toBe('')
    expect(measured.composition + measured.gap + measured.source).toBeCloseTo(measured.nutrition, 0)
  })

  test('nothing is stretched once the columns stack', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 })
    await page.goto(`/products/${CODE}`)
    await page.getByRole('heading', { name: 'Source' }).waitFor()

    const measured = await measure(page)

    expect(measured.composition + measured.gap + measured.source).toBeLessThan(measured.nutrition)
  })

  test('the ingredients list spans the full row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/products/${CODE}`)

    const ingredients = page.getByRole('heading', { name: 'Ingredients list' }).locator('xpath=..')
    const nutrition = page.getByRole('heading', { name: 'Nutrition' }).locator('xpath=..')

    const [wide, narrow] = await Promise.all([
      ingredients.evaluate((el) => el.getBoundingClientRect().width),
      nutrition.evaluate((el) => el.getBoundingClientRect().width),
    ])

    expect(wide).toBeGreaterThan(narrow)
  })
})

test.describe('the Nutri-Score filter row', () => {
  test('draws every value at the same height and type size', async ({ page }) => {
    await page.goto('/products')

    const chips = await page.getByRole('group', { name: 'Nutri-Score' }).evaluate((fieldset) =>
      [...fieldset.querySelectorAll('[role="img"]')].map((node) => {
        const style = getComputedStyle(node)
        return {
          label: node.getAttribute('aria-label') ?? '',
          height: node.getBoundingClientRect().height,
          fontSize: style.fontSize,
          letterSpacing: style.letterSpacing,
          textTransform: style.textTransform,
        }
      }),
    )

    expect(chips.length).toBeGreaterThan(1)

    const first = chips[0]!
    for (const chip of chips) {
      expect(chip.height, chip.label).toBeCloseTo(first.height, 1)
      expect(chip.fontSize, chip.label).toBe(first.fontSize)
      expect(chip.letterSpacing, chip.label).toBe(first.letterSpacing)
      expect(chip.textTransform, chip.label).toBe(first.textTransform)
    }
  })
})
