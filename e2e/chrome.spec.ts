import { expect, test, type Page } from '@playwright/test'

/**
 * Theme and the select control, together because both fail in only one theme or
 * one browser, and the suite used to run exclusively in the light Chromium
 * default. That is how a hydration mismatch shipped unnoticed.
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
   * The server cannot know a visitor's theme, so anything branching on it
   * during render produces one tree on the server and another on the client.
   * The failure is a mismatch rather than a visual difference, which no
   * screenshot catches, and only in one theme.
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
   * The toggle carries both icons and hides one. A leaf component that sets its
   * own `display` wins the cascade against that `hidden`, which drew a sun and a
   * moon side by side in the light theme while every test stayed green.
   */
  test('the theme toggle shows exactly one icon, in both themes', async ({ page }) => {
    await page.goto('/products')

    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'dark'), theme)

      const drawn = await page
        .getByRole('button', { name: /switch to (dark|light) theme/i })
        .evaluate((button) =>
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
   * The reason this is a real `<select>` rather than a listbox built from divs.
   *
   * Keyboard operation, type-ahead and the accessible role come from the
   * element. Asserting them here is asserting that nobody has replaced it with
   * a widget that looks the same and behaves worse.
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
   * The enhancement, where the browser supports it.
   *
   * `appearance: base-select` is what lets the open picker be styled rather
   * than being drawn by the operating system. It is not baseline in September
   * 2026, so this asserts the enhancement applies where it is available and
   * skips where it is not, instead of failing on a browser that is simply
   * getting the documented fallback.
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
