import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { transitionsSettled } from './support/motion'
import { RUNS_LOCALLY, SOURCE_DOWN_BASE_URL } from './support/servers'

const RATE_LIMITED = {
  statusCode: 429,
  statusMessage: 'The data source is rate limiting requests. Try again shortly.',
  data: { reason: 'upstream_rate_limited', retryAfter: null },
}

const isProductSearch = (url: URL) => url.pathname === '/api/products'
const isProductDetail = (url: URL) => /^\/api\/products\/\d+$/.test(url.pathname)

function failRequests(page: Page, matches: (url: URL) => boolean) {
  return page.route(matches, (route) => route.fulfill({ status: 429, json: RATE_LIMITED }))
}

async function openDirectory(page: Page, path = '/products') {
  await page.goto(path)
  await expect(page.getByTestId('product-row').first()).toBeVisible()
}

async function searchFor(page: Page, term: string) {
  await page.getByPlaceholder('Search by name, brand or ingredient').fill(term)
  await expect(page).toHaveURL(new RegExp(`q=${term}`))
}

test.describe('when the data source fails while browsing', () => {
  test('the directory says what happened in plain words, never the request behind it', async ({
    page,
  }) => {
    await openDirectory(page)
    await expect(page.getByRole('group', { name: 'Category' })).toBeVisible()

    await failRequests(page, isProductSearch)
    await searchFor(page, 'chocolate')

    const alert = page.getByRole('alert')
    await expect(
      alert.getByRole('heading', { name: "We couldn't load the products" }),
    ).toBeVisible()
    await expect(alert).toContainText('Open Food Facts')
    await expect(alert.getByTestId('error-illustration')).toBeVisible()
    await expect(alert).not.toContainText('/api/')
    await expect(alert).not.toContainText('429')
  })

  test('asks once, instead of repeating a request the server turned away', async ({ page }) => {
    await openDirectory(page)

    let calls = 0
    await page.route(isProductSearch, (route) => {
      calls++
      return route.fulfill({ status: 429, json: RATE_LIMITED })
    })
    await searchFor(page, 'chocolate')

    await expect(page.getByRole('alert')).toBeVisible()
    expect(calls).toBe(1)
  })

  test('the directory drops what it can no longer show, instead of pretending it is empty', async ({
    page,
  }) => {
    await openDirectory(page)

    await failRequests(page, isProductSearch)
    await searchFor(page, 'chocolate')

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Category' })).toBeHidden()
    await expect(page.getByText('No options for the current results')).toBeHidden()
    await expect(page.getByTestId('result-summary')).toBeHidden()
  })

  test('trying again shows it is working, then brings the products back', async ({ page }) => {
    await openDirectory(page)

    let failing = true
    let release!: () => void
    const recovered = new Promise<void>((resolve) => (release = resolve))
    await page.route(isProductSearch, async (route) => {
      if (failing) return route.fulfill({ status: 429, json: RATE_LIMITED })
      await recovered
      return route.continue()
    })

    await searchFor(page, 'chocolate')
    const retry = page.getByRole('alert').getByRole('button', { name: 'Try again' })
    await expect(retry).toBeVisible()

    failing = false
    await retry.click()

    await expect(retry).toBeDisabled()
    await expect(retry.getByTestId('spinner')).toBeVisible()

    release()

    await expect(page.getByRole('alert')).toBeHidden()
    await expect(page.getByTestId('product-row').first()).toBeVisible()
    await expect(page.getByTestId('result-summary')).toContainText(/\d/)
  })

  test('the overview says so too', async ({ page }) => {
    await openDirectory(page, '/products?q=chocolate')

    await failRequests(page, isProductSearch)
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Overview' })
      .click()

    await expect(
      page.getByRole('alert').getByRole('heading', { name: "We couldn't load the overview" }),
    ).toBeVisible()
  })

  test('the product page says so too', async ({ page }) => {
    await openDirectory(page)

    await failRequests(page, isProductDetail)
    await page.getByTestId('product-row').first().getByRole('link').first().click()

    await expect(
      page.getByRole('alert').getByRole('heading', { name: "We couldn't load this product" }),
    ).toBeVisible()
  })

  test('passes an accessibility scan', async ({ page }) => {
    await openDirectory(page)

    await failRequests(page, isProductSearch)
    await searchFor(page, 'chocolate')
    await expect(page.getByRole('alert')).toBeVisible()
    await transitionsSettled(page)

    const scan = await new AxeBuilder({ page }).include('[role="alert"]').analyze()
    expect(scan.violations).toEqual([])
  })
})

test.describe('when the data source is down on the first visit', () => {
  test.skip(!RUNS_LOCALLY, 'needs the local server whose data source is down')
  test.use({ baseURL: SOURCE_DOWN_BASE_URL })

  for (const { path, heading } of [
    { path: '/products?q=chocolate', heading: "We couldn't load the products" },
    { path: '/overview', heading: "We couldn't load the overview" },
    { path: '/products/3017620425035', heading: "We couldn't load this product" },
  ]) {
    test(`${path} still opens inside the app, with the same message`, async ({ page }) => {
      const mismatches: string[] = []
      page.on('console', (message) => {
        if (/hydration/i.test(message.text())) mismatches.push(message.text())
      })

      const response = await page.goto(path)

      expect(response?.status()).toBe(429)
      await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
      await expect(page.getByRole('alert').getByRole('heading', { name: heading })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByText('429')).toBeHidden()
      expect(mismatches).toEqual([])
    })
  }
})
