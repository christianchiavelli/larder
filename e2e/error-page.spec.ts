import { expect, test } from '@playwright/test'

test.describe('an address nothing answers to', () => {
  test('gets a 404 with its own page, rendered on the server', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    const response = await page.goto('/no-such-page')

    expect(response?.status()).toBe(404)
    await expect(page).toHaveTitle("This page isn't on the shelf | Larder")
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page isn't on the shelf")
    await expect(page.getByText('/no-such-page', { exact: true })).toBeVisible()

    await context.close()
  })

  test('keeps the shell, and leads back to the catalogue', async ({ page }) => {
    await page.goto('/no-such-page')

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to the front page' })).toHaveAttribute(
      'href',
      '/',
    )

    await page.getByRole('link', { name: 'Search the catalogue' }).click()

    await expect(page).toHaveURL(/\/products$/)
    await expect(page.getByTestId('product-row').first()).toBeVisible()
  })

  test('speaks the language of the address', async ({ page }) => {
    const response = await page.goto('/pt/pagina-que-nao-existe')

    expect(response?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Esta página não está na prateleira',
    )
    await expect(page.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute(
      'href',
      '/pt',
    )
  })

  test('offers the other language by its front page, since the address has no twin', async ({
    page,
  }) => {
    await page.goto('/pt/pagina-que-nao-existe')

    await expect(
      page.getByRole('navigation', { name: 'Idioma' }).getByRole('link', { name: /English/ }),
    ).toHaveAttribute('href', '/')
  })

  test('sits in the middle of the space the page would have filled', async ({ page }) => {
    await page.goto('/no-such-page')

    const main = await page.locator('main').boundingBox()
    const message = await page.getByTestId('error-view').getByRole('status').boundingBox()

    expect(main && message).toBeTruthy()
    const offset = message!.y + message!.height / 2 - (main!.y + main!.height / 2)
    expect(Math.abs(offset), `${offset}px off the middle`).toBeLessThan(4)
  })
})
