import { expect, test, type Page } from '@playwright/test'

const ABSOLUTE = /^https?:\/\/[^/]+/

function languageSwitch(page: Page, name: 'Language' | 'Idioma') {
  return page.getByRole('navigation', { name })
}

test.describe('languages', () => {
  test('serves Brazilian Portuguese under /pt, rendered on the server', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/pt')

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Todo alimento embalado, medido do mesmo jeito',
    )
    await expect(page.getByRole('searchbox', { name: 'Buscar no catálogo' })).toBeVisible()

    await context.close()
  })

  test('keeps English at the root, for every browser language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'pt-BR' })
    const page = await context.newPage()

    await page.goto('/')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await context.close()
  })

  test('points each page at its other language by a whole URL', async ({ page }) => {
    await page.goto('/pt/products')

    const href = (hreflang: string) =>
      page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`).getAttribute('href')

    expect(await href('en')).toMatch(new RegExp(`${ABSOLUTE.source}/products$`))
    expect(await href('pt-BR')).toMatch(new RegExp(`${ABSOLUTE.source}/pt/products$`))
    expect(await href('x-default')).toMatch(new RegExp(`${ABSOLUTE.source}/products$`))
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(
      new RegExp(`${ABSOLUTE.source}/pt/products$`),
    )
  })

  test('switches to the same page in the other language, filters and all', async ({ page }) => {
    await page.goto('/products?nutriScore=a')

    // Each link names its language in that language, after the code it shows.
    await languageSwitch(page, 'Language')
      .getByRole('link', { name: /Português/ })
      .click()

    await expect(page).toHaveURL(/\/pt\/products\?nutriScore=a$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible()
    await expect(page.getByTestId('product-row').first()).toBeVisible()

    await languageSwitch(page, 'Idioma')
      .getByRole('link', { name: /English/ })
      .click()

    await expect(page).toHaveURL(
      (url) => url.pathname === '/products' && url.searchParams.get('nutriScore') === 'a',
    )
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
  })

  test('marks the language being read as the current one', async ({ page }) => {
    await page.goto('/pt/overview')

    const current = languageSwitch(page, 'Idioma').locator('[aria-current="true"]')

    await expect(current).toHaveAttribute('lang', 'pt-BR')
    await expect(current).toContainText('PT')
    await expect(languageSwitch(page, 'Idioma').getByRole('link')).toHaveCount(1)
  })

  test('writes numbers the Brazilian way, in both directions of the count', async ({ page }) => {
    await page.goto('/pt/products')

    await expect(page.getByTestId('result-summary')).toHaveText(
      '10.000+ produtos (a fonte para de contar em 10.000)',
    )

    await page.goto('/products')

    await expect(page.getByTestId('result-summary')).toHaveText(
      '10,000+ products (upstream stops counting at 10,000)',
    )
  })

  test('names countries in Portuguese, the rest of the catalogue in English', async ({ page }) => {
    await page.goto('/pt/products')

    const countries = page.getByRole('group', { name: 'País' })
    await expect(countries.getByText('França', { exact: true })).toBeVisible()
    await expect(page.getByTestId('language-note')).toBeVisible()

    await page.goto('/products')

    await expect(
      page.getByRole('group', { name: 'Country' }).getByText('France', { exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('language-note')).toHaveCount(0)
  })

  test('opens a product in the language it was linked from', async ({ page }) => {
    await page.goto('/pt/products')

    await page.getByTestId('product-row').first().getByRole('link').first().click()

    await expect(page).toHaveURL(/\/pt\/products\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Informação nutricional' })).toBeVisible()
  })
})
