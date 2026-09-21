import { expect, test, type Page } from '@playwright/test'

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('theme', () => {
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

    await expect(page.locator('html')).not.toHaveClass(new RegExp(before ?? '^$'))
    await expect(page.getByRole('button', { name: /switch to (dark|light) theme/i })).toBeVisible()
  })

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

  test('opts into the customizable select where supported', async ({ page }) => {
    const supported = await page.evaluate(() => CSS.supports('appearance', 'base-select'))
    test.skip(!supported, 'Browser does not implement the customizable select API')

    const appearance = await page
      .getByLabel('Sort')
      .evaluate((element) => getComputedStyle(element).appearance)

    expect(appearance).toBe('base-select')

    const mirrored = await page
      .getByLabel('Sort')
      .evaluate((element) => !!element.querySelector('selectedcontent'))

    expect(mirrored, '<selectedcontent> was not rendered').toBe(true)
  })

  test('survives HTML parsing with its button intact', async ({ page }) => {
    const hasButton = await page
      .getByLabel('Sort')
      .evaluate((element) => !!element.querySelector('button'))

    expect(hasButton).toBe(true)
  })
})

test.describe('the see more button', () => {
  const fab = (page: Page) => page.getByRole('button', { name: 'Skip to the next section' })

  function sections(page: Page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('[data-scroll-section]')].map((element) => ({
        top: element.getBoundingClientRect().top,
        scrollMarginTop: parseFloat(getComputedStyle(element).scrollMarginTop) || 0,
      })),
    )
  }

  test('parks each section in turn at its own scroll margin', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/overview')
    await expect(fab(page)).toBeVisible()

    const visited: number[] = []
    for (let step = 0; step < 4 && (await fab(page).isVisible()); step++) {
      await fab(page).click()
      await page.waitForTimeout(600)

      const measured = await sections(page)
      const parked = measured.findIndex(
        ({ top, scrollMarginTop }) => Math.abs(top - scrollMarginTop) <= 1,
      )
      if (parked !== -1) visited.push(parked)
    }

    expect(visited).toEqual([...visited].sort((a, b) => a - b))
    expect(new Set(visited).size).toBe(visited.length)
    expect(visited.length).toBeGreaterThan(1)
  })

  test('stops offering itself once the end is reached', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/overview')

    for (let step = 0; step < 8 && (await fab(page).isVisible()); step++) {
      await fab(page).click()
      await page.waitForTimeout(600)
    }

    await expect(fab(page)).toBeHidden()
  })

  test('is absent on a page with no sections', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/products')
    await expect(page.getByTestId('product-row').first()).toBeVisible()

    await expect(fab(page)).toBeHidden()
  })

  test('is absent when the whole page already fits', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 2400 })
    await page.goto('/overview')
    await expect(page.getByRole('heading', { name: 'Nutri-Score distribution' })).toBeVisible()

    await expect(fab(page)).toBeHidden()
  })
})
