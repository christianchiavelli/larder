import { expect, test, type Page } from '@playwright/test'
import { hydrated } from './support/hydration'

const PAGES = ['/', '/products', '/products/3017620425035', '/overview', '/pt', '/no-such-page']

/** Opens `path` and returns what the page's policy blocked on the way, once it has hydrated. */
async function violationsOn(page: Page, path: string): Promise<string[]> {
  await page.goto(path)
  // Hydrating means the app's own scripts ran, under the policy.
  await hydrated(page)
  return page.evaluate(() => (window as unknown as { violations: string[] }).violations)
}

test.describe('security headers', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const violations: string[] = []
      Object.assign(window, { violations })
      document.addEventListener('securitypolicyviolation', (event) =>
        violations.push(
          `${event.effectiveDirective} ${event.blockedURI} at ${event.sourceFile}:${event.lineNumber} “${event.sample}”`,
        ),
      )
    })
  })

  test('come with every page, which no longer names its framework', async ({ request }) => {
    const headers = (await request.get('/products')).headers()

    expect(headers['content-security-policy']).toMatch(/script-src 'self'( 'sha256-[^']+')+;/)
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(headers['x-powered-by']).toBeUndefined()
  })

  for (const path of PAGES) {
    test(`let ${path} run with nothing blocked`, async ({ page }) => {
      expect(await violationsOn(page, path)).toEqual([])
    })
  }

  test('let the theme switch with nothing blocked', async ({ page }) => {
    await violationsOn(page, '/products')

    await page.getByRole('button', { name: 'Switch to dark theme' }).click()

    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    expect(
      await page.evaluate(() => (window as unknown as { violations: string[] }).violations),
    ).toEqual([])
  })

  test('fit the front page served from the cache as well as the one rendered', async ({ page }) => {
    for (const visit of ['first', 'second']) {
      expect(await violationsOn(page, '/'), `the ${visit} visit`).toEqual([])
    }
  })
})
