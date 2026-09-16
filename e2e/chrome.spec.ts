import { expect, test, type Page } from '@playwright/test'

/**
 * Both fail in only one theme or one browser, and the suite used to run only in
 * the light Chromium default.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('theme', () => {
  /**
   * Anything branching on the theme during render produces one tree on the server
   * and another on the client. No screenshot catches that.
   */
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`hydrates without a mismatch in ${colorScheme} mode`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme })
      const page = await context.newPage()
      const errors = collectErrors(page)

      await page.goto('/products')
      await page.getByTestId('product-row').first().waitFor()
      await page.waitForLoadState('networkidle')

      expect(errors.filter((error) => /hydrat/i.test(error))).toEqual([])

      await context.close()
    })
  }

  test('applies the stored theme before the first paint', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' })
    const page = await context.newPage()

    // A returning visitor who chose dark. The inline bootstrap script has to
    // put the class on <html> before anything renders, or they get a white
    // flash on every navigation.
    await page.addInitScript(() => {
      localStorage.setItem('larder-theme', 'dark')
    })

    await page.goto('/products')

    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('the theme toggle is reachable and labelled in both states', async ({ page }) => {
    await page.goto('/products')

    const toggle = page.getByRole('button', { name: /switch to (dark|light) theme/i })
    await expect(toggle).toBeVisible()

    const before = await page.locator('html').getAttribute('class')
    await toggle.click()

    // The label describes the action, so it has to change with the state.
    await expect(page.locator('html')).not.toHaveClass(new RegExp(before ?? '^$'))
    await expect(page.getByRole('button', { name: /switch to (dark|light) theme/i })).toBeVisible()
  })

  /**
   * A leaf component that sets its own `display` beats the `hidden` a caller
   * passes, which drew a sun and a moon at once while every test stayed green.
   */
  test('the theme toggle shows exactly one icon, in both themes', async ({ page }) => {
    await page.goto('/products')

    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (t) => document.documentElement.classList.toggle('dark', t === 'dark'),
        theme,
      )

      const drawn = await page
        .getByRole('button', { name: /switch to (dark|light) theme/i })
        .evaluate(
          (button) =>
            [...button.querySelectorAll('svg')].filter(
              (icon) => getComputedStyle(icon).display !== 'none',
            ).length,
        )

      expect(drawn, `the ${theme} theme drew ${drawn} icons`).toBe(1)
    }
  })
})

test.describe('select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  /**
   * Keyboard, type-ahead and the accessible role come from the element. Asserting
   * them is asserting nobody has replaced it with divs.
   */
  test('is a real select, operable by keyboard', async ({ page }) => {
    const select = page.getByLabel('Sort')

    await expect(select).toHaveRole('combobox')
    await expect(select).toHaveValue('relevance')

    await select.focus()
    await select.selectOption('popularity')

    await expect(page).toHaveURL(/sort=popularity/)
  })

  test('writes the chosen value to the URL', async ({ page }) => {
    await page.getByLabel('Sort').selectOption('nutriscore')

    await expect(page).toHaveURL(/sort=nutriscore/)
    await expect(page.getByLabel('Sort')).toHaveValue('nutriscore')
  })

  test('restores its value from the URL', async ({ page }) => {
    await page.goto('/products?sort=popularity')

    await expect(page.getByLabel('Sort')).toHaveValue('popularity')
  })

  /**
   * `appearance: base-select` is not baseline in September 2026, so this asserts
   * where it applies and skips where the documented fallback is correct.
   */
  test('opts into the customizable select where supported', async ({ page }) => {
    const supported = await page.evaluate(() => CSS.supports('appearance', 'base-select'))
    test.skip(!supported, 'Browser does not implement the customizable select API')

    const appearance = await page
      .getByLabel('Sort')
      .evaluate((element) => getComputedStyle(element).appearance)

    expect(appearance).toBe('base-select')

    // `<selectedcontent>` mirrors the chosen option into the closed button.
    // Vue renders nothing for it unless the compiler is told the tag exists,
    // which is a silent failure: the control looks empty rather than broken.
    const mirrored = await page
      .getByLabel('Sort')
      .evaluate((element) => !!element.querySelector('selectedcontent'))

    expect(mirrored, '<selectedcontent> was not rendered').toBe(true)
  })

  test('survives HTML parsing with its button intact', async ({ page }) => {
    // `<button>` inside `<select>` is only legal under the customizable select
    // spec. If a parser dropped it the control would still work but could not
    // be styled, so this checks the server-rendered markup survived.
    const hasButton = await page
      .getByLabel('Sort')
      .evaluate((element) => !!element.querySelector('button'))

    expect(hasButton).toBe(true)
  })
})
