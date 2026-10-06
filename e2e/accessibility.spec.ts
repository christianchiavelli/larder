import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { transitionsSettled } from './support/motion'

// Whole pages, as a visitor lands on them. The other scans look at the region a test is
// about, so a faint footer or filter legend passed them all; here it would not.
const PAGES = [
  ['the front page', '/'],
  ['the overview', '/overview'],
  ['the directory', '/products'],
  ['a product', '/products/3017620425035'],
  ['the directory in Portuguese', '/pt/products'],
  ['a product in Portuguese', '/pt/products/7891000100103'],
  ['the not-found page', '/no-such-page'],
  ['the not-found page in Portuguese', '/pt/pagina-que-nao-existe'],
] as const

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`every page in the ${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const [name, path] of PAGES) {
      test(`${name} meets WCAG AA`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await transitionsSettled(page)

        const scan = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()

        const faults = scan.violations.flatMap((violation) =>
          violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
        )
        expect(faults).toEqual([])
      })
    }
  })
}
