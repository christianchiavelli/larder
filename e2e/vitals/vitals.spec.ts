import { expect, test } from '@playwright/test'
import { measure, tap, typeInto, type Visit } from './measure'
import {
  ATTACHMENT,
  METRICS,
  explain,
  format,
  limitOf,
  readBaseline,
  summarise,
  type Measurement,
} from './report'

/**
 * Each page visited five times, the way a reader uses it on a phone: loaded
 * cold, read to the end, then put to work. The median of each metric is held
 * against the baseline, and a page that has none yet is measured, not judged.
 * Open Food Facts answers from a recording (`e2e/vitals/catalogue.json`), so
 * a page is timed on its own work rather than on the catalogue's latency.
 */
const recording = !!process.env.VITALS_RECORD
const VISITS = recording ? 1 : 5

const PAGES: readonly Visit[] = [
  {
    key: 'front',
    name: 'The front page',
    path: '/',
    journey: async (page) => {
      // Searches the catalogue from the hero.
      await typeInto(page.getByRole('searchbox', { name: 'Search the catalogue' }), 'chocolate')
      await tap(page.getByRole('button', { name: 'Search', exact: true }))
      await expect(page).toHaveURL(/\/products\?q=chocolate$/)
      await expect(page.getByTestId('product-row').first()).toBeVisible()
    },
  },
  {
    key: 'directory',
    name: 'The directory',
    path: '/products',
    journey: async (page) => {
      // Narrows to the best grade, which reloads the list and every facet.
      await tap(page.getByRole('button', { name: /Nutri-Score A,/ }))
      await expect(page).toHaveURL(/nutriScore=a/)
      await expect(page.getByTestId('product-row').first()).toBeVisible()

      // Unfolds the categories, then opens the first product.
      await tap(page.getByRole('button', { name: /^Show \d+ more$/ }).first())
      await tap(page.getByTestId('product-row').first().getByRole('link').first())
      await expect(page).toHaveURL(/\/products\/\d+$/)
    },
  },
  {
    key: 'overview',
    name: 'The overview',
    path: '/overview',
    journey: async (page) => {
      // Leaves the charts for the directory, as the page invites.
      await tap(page.getByRole('link', { name: 'Open the directory' }))
      await expect(page).toHaveURL(/\/products$/)
      await expect(page.getByTestId('product-row').first()).toBeVisible()
    },
  },
  {
    key: 'product',
    name: 'A product page',
    path: '/products/3017620425035',
    journey: async (page) => {
      // Follows its first category back to the directory.
      await tap(page.locator('main header').getByRole('link').first())
      await expect(page).toHaveURL(/\/products\?category=/)
      await expect(page.getByTestId('product-row').first()).toBeVisible()
    },
  },
]

const baseline = readBaseline()
// The baseline is the CI runners' own: another machine's numbers are set against it, not judged by it.
const judged = !!process.env.CI

for (const { journey, ...page } of PAGES) {
  test(`${page.name}, ${page.path}`, async ({ browser, baseURL }, testInfo) => {
    const visits: Measurement[] = []
    for (let visit = 1; visit <= VISITS; visit++) {
      visits.push(
        await test.step(`visit ${visit} of ${VISITS}`, () =>
          measure(browser, baseURL!, { ...page, journey }, { throttled: !recording })),
      )
    }
    if (recording) return

    const result = summarise(page, visits)
    await testInfo.attach(ATTACHMENT, {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })

    const base = baseline.pages[page.key]
    if (!base || !judged) {
      testInfo.annotations.push({
        type: 'notice',
        description: base
          ? 'Measured off CI: compared, not judged'
          : 'No baseline yet: measured, not judged',
      })
      return
    }
    for (const metric of METRICS) {
      const value = result.median[metric]
      const typical = visits.find((visit) => visit[metric].value === value)![metric]
      expect
        .soft(
          value,
          `${metric} ${format(metric, value)} against a baseline of ${format(metric, base[metric])}, ${explain(metric, typical)}`,
        )
        .toBeLessThanOrEqual(limitOf(metric, base[metric]))
    }
  })
}
