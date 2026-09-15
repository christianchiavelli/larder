import { expect, test, type Page } from '@playwright/test'

/**
 * Guards against a class of failure nothing else in this repository can see.
 *
 * Tailwind generates a utility only if it finds the class name while scanning
 * source files. When a directory falls outside that scan, every utility used
 * only in it silently stops existing. The markup still carries the class, the
 * token still resolves, the build succeeds, and types, lint and unit tests all
 * pass. The element just renders unstyled.
 *
 * That happened here: Nuxt sets the Vite root to the app directory, so nothing
 * under `layers/` was scanned, and every design-system-only utility was dead.
 * `bg-nutri-a` computed to transparent while `bg-surface-raised`, which the app
 * also used, was fine. The fix is the `@source` block in ui.css; this spec is
 * what will notice if it is ever removed or the paths drift.
 *
 * Asserting on generated CSS is usually a smell, because it tests the framework
 * rather than the code. Here the framework's output *is* the contract: a design
 * token that does not reach the page is a broken token.
 */

/** Every rule selector in the document, flattened. */
async function selectors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []

    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) found.push(rule.selectorText)
        // Utilities can be nested inside @layer or @media.
        else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
      }
    }

    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules)
      } catch {
        // A cross-origin sheet cannot be read. None of ours are, so an
        // unreadable sheet is simply not one we are asserting about.
      }
    }

    return found
  })
}

/** Resolves a utility by applying it to an element outside the layout flow. */
async function computeUtility(page: Page, className: string, property: string): Promise<string> {
  return page.evaluate(
    ([cls, prop]) => {
      const probe = document.createElement('div')
      probe.className = cls!
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      document.body.append(probe)
      const value = getComputedStyle(probe).getPropertyValue(prop!)
      probe.remove()
      return value
    },
    [className, property] as const,
  )
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

test.describe('design tokens reach the browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  /**
   * Defined only in the UI layer, so these are the ones that disappear when
   * source scanning misses `layers/`.
   */
  test('layer-only colour utilities resolve', async ({ page }) => {
    for (const utility of ['bg-nutri-a', 'bg-nutri-c', 'bg-nutri-e', 'bg-nova-1', 'bg-nova-4']) {
      const value = await computeUtility(page, utility, 'background-color')
      expect(value, `${utility} produced no colour`).not.toBe(TRANSPARENT)
    }
  })

  test('the chrome palette resolves', async ({ page }) => {
    expect(await computeUtility(page, 'bg-chrome', 'background-color')).not.toBe(TRANSPARENT)
    expect(await computeUtility(page, 'bg-chrome-raised', 'background-color')).not.toBe(TRANSPARENT)
  })

  test('layer-only sizing utilities resolve', async ({ page }) => {
    // Only tokens something actually uses. Tailwind generates on demand, so
    // asserting on an unused one tests nothing about source scanning and fails
    // for the unrelated reason that nobody referenced it. A token with no
    // consumer should be deleted, not propped up by a test.
    expect(await computeUtility(page, 'rounded-card', 'border-radius')).not.toBe('0px')
    expect(await computeUtility(page, 'rounded-control', 'border-radius')).not.toBe('0px')
  })

  /**
   * Asserts the rule was generated, not that each step has a unique size.
   *
   * Two steps are allowed to share a font size and differ only in weight, which
   * `text-subheading` and `text-body` do. Comparing computed sizes would call
   * that a failure. What actually matters is whether the utility exists at all,
   * so this looks for the rule itself.
   */
  test('every named typography step is generated', async ({ page }) => {
    const rules = await selectors(page)

    const steps = [
      'text-title',
      'text-heading',
      'text-subheading',
      'text-body',
      'text-label',
      'text-caption',
      'text-overline',
      'text-metric',
      'text-metric-sm',
    ]

    for (const step of steps) {
      expect(
        rules.some((selector) => selector.split(/[\s,>]+/).includes(`.${step}`)),
        `.${step} was never generated`,
      ).toBe(true)
    }
  })

  /**
   * The pairing is the identity: headings are serif, anything a reader scans or
   * compares is sans. If a step silently lost its family the page would still
   * render, just uniformly and anonymously.
   */
  test('headings are serif and figures are sans', async ({ page }) => {
    expect(await computeUtility(page, 'text-title', 'font-family')).toContain('Fraunces')
    expect(await computeUtility(page, 'text-heading', 'font-family')).toContain('Fraunces')
    expect(await computeUtility(page, 'text-body', 'font-family')).toContain('Public Sans')
    // Fraunces' numerals are proportional, so a metric set in it could not line
    // up in a column.
    expect(await computeUtility(page, 'text-metric', 'font-family')).toContain('Public Sans')
  })

  test('figures are tabular so columns line up', async ({ page }) => {
    expect(await computeUtility(page, 'text-metric', 'font-variant-numeric')).toContain(
      'tabular-nums',
    )
  })

  test('Nutri-Score keeps its regulated colours rather than the theme palette', async ({
    page,
  }) => {
    // Set by the scheme's own guidelines. Recolouring them to suit a palette
    // would make the badge misrepresent a regulated label.
    expect(await computeUtility(page, 'bg-nutri-a', 'background-color')).toBe('rgb(3, 129, 65)')
    expect(await computeUtility(page, 'bg-nutri-e', 'background-color')).toBe('rgb(230, 62, 17)')
  })

  test('the semantic palette changes with the theme and the domain palette does not', async ({
    page,
  }) => {
    const lightSurface = await computeUtility(page, 'bg-surface-raised', 'background-color')
    const lightNutri = await computeUtility(page, 'bg-nutri-a', 'background-color')

    await page.evaluate(() => document.documentElement.classList.add('dark'))

    const darkSurface = await computeUtility(page, 'bg-surface-raised', 'background-color')
    const darkNutri = await computeUtility(page, 'bg-nutri-a', 'background-color')

    expect(darkSurface, 'surfaces should follow the theme').not.toBe(lightSurface)
    expect(darkNutri, 'a regulated label colour should not').toBe(lightNutri)
  })
})
