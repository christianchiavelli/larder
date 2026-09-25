import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Download, type Locator, type Page } from '@playwright/test'
import { parse } from 'csv-parse/sync'

async function records(download: Download): Promise<Record<string, string>[]> {
  const text = await readFile(await download.path(), 'utf8')
  expect(text.startsWith('\uFEFF'), 'the file has no UTF-8 byte order mark').toBe(true)

  return parse<Record<string, string>>(text, { bom: true, columns: true })
}

function exportDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Export to CSV' })
}

async function openExport(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Export CSV' }).click()

  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  return dialog
}

function downloadLink(dialog: Locator): Locator {
  return dialog.getByRole('link', { name: 'Download CSV' })
}

async function settledCount(dialog: Locator): Promise<number> {
  const count = dialog.getByTestId('export-count')
  await expect(count).toContainText(/\d products?/)

  return Number((await count.innerText()).match(/([\d,]+) products?/)![1]!.replaceAll(',', ''))
}

async function transitionsSettled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
}

async function pickCategory(dialog: Locator, term: string, option: string) {
  await dialog.getByRole('button', { name: /^Category/ }).click()
  await dialog.getByRole('combobox', { name: 'Search categories' }).fill(term)
  await dialog.getByRole('option', { name: new RegExp(`^${option}(,|$)`) }).click()
}

test.describe('exporting the directory', () => {
  test('opens on the search the directory is showing', async ({ page }) => {
    await page.goto('/products?q=spread&brand=nutella&nutriScore=e')

    const dialog = await openExport(page)

    await expect(dialog.getByLabel('Contains the word')).toHaveValue('spread')
    await expect(dialog.getByRole('button', { name: 'Remove Nutella' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Nutri-Score E,/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('downloads exactly as many products as it counted', async ({ page }) => {
    await page.goto('/products?brand=nutella')

    const dialog = await openExport(page)
    const counted = await settledCount(dialog)
    expect(counted).toBeGreaterThan(0)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadLink(dialog).click(),
    ])

    expect(download.suggestedFilename()).toBe('larder-products.csv')
    expect(await records(download)).toHaveLength(counted)
    await expect(dialog).toBeHidden()
  })

  test('holds the download back while the search is too big, and says what to do', async ({
    page,
  }) => {
    await page.goto('/products?q=chocolate')

    const dialog = await openExport(page)

    await expect(dialog.getByTestId('export-too-many')).toBeVisible()
    await expect(dialog.getByTestId('export-count')).toContainText('10,000+ products')
    await expect(downloadLink(dialog)).toHaveAttribute('aria-disabled', 'true')
    await expect(downloadLink(dialog)).not.toHaveAttribute('href')
    await expect(
      dialog.getByRole('link', { name: /full Open Food Facts dataset/ }),
    ).toHaveAttribute('href', 'https://world.openfoodfacts.org/data')
  })

  test('narrows a search that is too big until every match fits', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)
    await expect(dialog.getByTestId('export-too-many')).toBeVisible()

    await pickCategory(dialog, 'bonbons', 'Bonbons')
    await page.keyboard.press('Escape')

    await expect(dialog.getByTestId('export-too-many')).toBeHidden()
    expect(await settledCount(dialog)).toBeLessThanOrEqual(10_000)

    const href = await downloadLink(dialog).getAttribute('href')
    const { pathname, searchParams } = new URL(href!, 'http://larder.test')
    expect(pathname).toBe('/api/products.csv')
    expect(searchParams.get('q')).toBe('chocolate')
    expect(searchParams.getAll('category')).toEqual(['en:bonbons'])
  })

  test('leaves the directory behind it as it was', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)

    await pickCategory(dialog, 'bonbons', 'Bonbons')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/products\?q=chocolate$/)
  })

  test('starts over from the directory every time it opens', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    let dialog = await openExport(page)

    await dialog.getByRole('button', { name: 'Remove Nutella' }).click()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()

    dialog = await openExport(page)
    await expect(dialog.getByRole('button', { name: 'Remove Nutella' })).toBeVisible()
  })

  test('holds the download back until the count has caught up', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)
    await expect(downloadLink(dialog)).toHaveAttribute('href', '/api/products.csv?brand=nutella')

    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(
      (url) => url.pathname === '/api/products/count',
      async (route) => {
        await held
        await route.continue()
      },
    )

    await dialog.getByRole('button', { name: /Nutri-Score E,/ }).click()

    await expect(downloadLink(dialog)).toHaveAttribute('aria-disabled', 'true')
    await expect(downloadLink(dialog)).not.toHaveAttribute('href')

    release()

    await expect(downloadLink(dialog)).toHaveAttribute(
      'href',
      '/api/products.csv?brand=nutella&nutriScore=e',
    )
  })

  test('leaves the page number behind and keeps the sort', async ({ page }) => {
    await page.goto('/products?brand=nutella&sort=popularity&page=2&pageSize=48')

    const dialog = await openExport(page)

    await expect(downloadLink(dialog)).toHaveAttribute(
      'href',
      '/api/products.csv?brand=nutella&sort=popularity',
    )
  })

  test('offers nothing to export when nothing matches', async ({ page }) => {
    await page.goto('/products?q=qzxvqzxvqzxv')

    await expect(page.getByText('No products match these filters')).toBeVisible()
    await expect(page.getByRole('button', { name: /Export/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Export/ })).toHaveCount(0)
  })

  test('works before any JavaScript runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/products?brand=nutella&nutriScore=e')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Export CSV' }).click(),
    ])
    const rows = await records(download)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row['Nutri-Score'] === 'e')).toBe(true)

    await context.close()
  })

  test('links the full dataset from the footer of every page', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Download the full dataset' }),
    ).toHaveAttribute('href', 'https://world.openfoodfacts.org/data')
  })
})

test.describe('the pickers in the export dialog', () => {
  async function openCountries(dialog: Locator): Promise<Locator> {
    await dialog.getByRole('button', { name: /^Country/ }).click()
    const list = dialog.getByRole('listbox', { name: 'Country' })
    await expect(list.getByRole('option').nth(1)).toBeVisible()
    return list
  }

  test('list what the search already holds before a word is typed, with a count for each', async ({
    page,
  }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)

    const list = await openCountries(dialog)
    const values = list.getByRole('option').filter({ hasNotText: 'All countries' })

    expect(await values.count()).toBeGreaterThan(1)
    for (const text of await values.allInnerTexts()) {
      expect(text, `${text} has no count beside it`).toMatch(/\d/)
    }
  })

  test('read no selection as every value, and say so', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)
    const list = await openCountries(dialog)
    const all = list.getByRole('option', { name: 'All countries' })

    await expect(all).toHaveAttribute('aria-selected', 'true')

    const first = list.getByRole('option').filter({ hasNotText: 'All countries' }).first()
    await first.click()
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await expect(all).toHaveAttribute('aria-selected', 'false')

    await all.click()
    await expect(all).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(0)
  })

  test('keep offering the other values of a dimension once one is picked', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)
    const list = await openCountries(dialog)
    const values = list.getByRole('option').filter({ hasNotText: 'All countries' })
    const before = await values.count()

    await values.first().click()

    await expect(values).toHaveCount(before)
  })
})

test.describe('the export dialog while it works', () => {
  function holdRequests(page: Page, pathname: string): Promise<() => void> {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))

    return page
      .route(
        (url) => url.pathname === pathname,
        async (route) => {
          await held
          await route.continue()
        },
      )
      .then(() => release)
  }

  test('spins inside the word field, and beside the count, until the count is back', async ({
    page,
  }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)
    await settledCount(dialog)

    const release = await holdRequests(page, '/api/products/count')
    const field = dialog.getByTestId('export-term-field')
    const count = dialog.getByTestId('export-count')

    await dialog.getByLabel('Contains the word').fill('spread')

    await expect(field.getByTestId('spinner')).toBeVisible()
    await expect(count.getByTestId('spinner')).toBeVisible()

    release()

    await expect(field.getByTestId('spinner')).toBeHidden()
    await expect(count.getByTestId('spinner')).toBeHidden()
  })

  test('spins beside the count alone when the change did not come from the word field', async ({
    page,
  }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)
    await settledCount(dialog)

    const release = await holdRequests(page, '/api/products/count')

    await dialog.getByRole('button', { name: /Nutri-Score E,/ }).click()

    await expect(dialog.getByTestId('export-count').getByTestId('spinner')).toBeVisible()
    await expect(dialog.getByTestId('export-term-field').getByTestId('spinner')).toBeHidden()

    release()
  })

  test('spins inside the search field of a list while it looks the term up', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)

    const release = await holdRequests(page, '/api/suggest')

    await dialog.getByRole('button', { name: /^Category/ }).click()
    const search = dialog.getByRole('combobox', { name: 'Search categories' })
    await search.fill('bonb')

    const searchField = search.locator('..')
    await expect(searchField.getByTestId('spinner')).toBeVisible()

    release()

    await expect(dialog.getByRole('option', { name: /^Bonbons(,|$)/ })).toBeVisible()
    await expect(searchField.getByTestId('spinner')).toBeHidden()
  })

  test('keeps a spinner turning for a reader who asked for less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)

    const release = await holdRequests(page, '/api/products/count')
    await dialog.getByLabel('Contains the word').fill('spread')

    const spinner = dialog.getByTestId('export-term-field').getByTestId('spinner')
    await expect(spinner).toBeVisible()
    expect(await spinner.evaluate((element) => getComputedStyle(element).animationDuration)).toBe(
      '1s',
    )

    release()
  })

  test('moves on the motion tokens the rest of the project uses', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)

    const enter = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.transitionDuration = 'var(--duration-enter)'
      document.body.append(probe)
      const duration = getComputedStyle(probe).transitionDuration
      probe.remove()
      return duration
    })
    expect(enter).not.toBe('0s')

    const durations = (element: Element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .map((value) => value.trim())
    expect(new Set(await dialog.evaluate(durations))).toEqual(new Set([enter]))

    await dialog.getByRole('button', { name: /^Category/ }).click()
    const list = dialog.getByRole('dialog', { name: 'Category' })
    await expect(list).toBeVisible()
    expect(new Set(await list.evaluate(durations))).toEqual(new Set([enter]))
  })
})

test.describe('the export dialog as a modal', () => {
  test('takes focus when it opens and hands it back when it closes', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const trigger = page.getByRole('button', { name: 'Export CSV' })

    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = exportDialog(page)
    await expect(dialog.getByRole('heading', { name: 'Export to CSV' })).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('keeps the page behind it out of reach', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    await openExport(page)

    for (let press = 0; press < 30; press++) {
      await page.keyboard.press('Tab')

      const reachedThePage = await page.evaluate(() => {
        const active = document.activeElement
        const dialog = document.querySelector('dialog[open]')
        return active !== document.body && !dialog?.contains(active)
      })
      expect(reachedThePage, `tab ${press + 1} reached the page behind the dialog`).toBe(false)
    }
  })

  test('holds the page still behind it, and lets it scroll again once closed', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'a phone scrolls by touch, not by wheel')

    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)

    await page.mouse.move(4, 400)
    await page.mouse.wheel(0, 800)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.mouse.wheel(0, 800)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('closes on a click outside it', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)

    await page.mouse.click(4, 4)

    await expect(dialog).toBeHidden()
  })

  test('closes the list with Escape, and only the list', async ({ page }) => {
    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)
    const trigger = dialog.getByRole('button', { name: /^Category/ })

    await trigger.click()
    const search = dialog.getByRole('combobox', { name: 'Search categories' })
    await expect(search).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(search).toBeHidden()
    await expect(dialog).toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('picks an option from the keyboard alone', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)

    await dialog.getByRole('button', { name: /^Category/ }).focus()
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('combobox', { name: 'Search categories' })).toBeFocused()
    await page.keyboard.type('bonbons')
    await expect(dialog.getByRole('option', { name: /^Bonbons(,|$)/ })).toBeVisible()
    await page.keyboard.press('Enter')

    await expect(dialog.getByRole('option', { name: /^Bonbons(,|$)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Remove Bonbons' })).toBeAttached()
  })

  test('has no accessibility violations, with or without a list open', async ({ page }) => {
    await page.goto('/products?q=chocolate')
    const dialog = await openExport(page)
    await expect(dialog.getByTestId('export-too-many')).toBeVisible()

    await transitionsSettled(page)
    const closed = await new AxeBuilder({ page }).include('dialog[open]').analyze()
    expect(closed.violations).toEqual([])

    await dialog.getByRole('button', { name: /^Brand/ }).click()
    await dialog.getByRole('combobox', { name: 'Search brands' }).fill('lindt')
    await expect(dialog.getByRole('option').first()).toBeVisible()

    await transitionsSettled(page)
    const withList = await new AxeBuilder({ page }).include('dialog[open]').analyze()
    expect(withList.violations).toEqual([])
  })

  test('rises from the bottom as a sheet on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the sheet is the phone layout')

    await page.goto('/products?brand=nutella')
    const dialog = await openExport(page)
    const viewport = page.viewportSize()!

    await expect
      .poll(async () => {
        const box = await dialog.boundingBox()
        return box && [Math.round(box.width), Math.round(box.y + box.height)]
      })
      .toEqual([viewport.width, viewport.height])
  })
})
