import { expect, test } from '@playwright/test'

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
 * Asserting on computed styles is usually a smell, because it tests the
 * framework rather than the code. Here the framework's output *is* the
 * contract: a design token that does not reach the page is a broken token.
 */

/** Resolves a utility by applying it to a throwaway element. */
async function computeUtility(
  page: import('@playwright/test').Page,
  className: string,
  property: string,
): Promise<string> {
  return page.evaluate(
    ([cls, prop]) => {
      const probe = document.createElement('div')
      probe.className = cls!
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

  test('layer-only sizing utilities resolve', async ({ page }) => {
    // Only tokens something actually uses. Tailwind generates on demand, so
    // asserting on an unused one tests nothing about source scanning and fails
    // for the unrelated reason that nobody referenced it. A token with no
    // consumer should be deleted, not propped up by a test.
    expect(await computeUtility(page, 'rounded-card', 'border-radius')).not.toBe('0px')
    expect(await computeUtility(page, 'rounded-control', 'border-radius')).not.toBe('0px')
  })

  /**
   * A typography token that does not exist falls back to the inherited size
   * with no warning anywhere, which makes it invisible in review.
   */
  test('every named typography step resolves to its own size', async ({ page }) => {
    const steps = [
      'text-display',
      'text-title',
      'text-heading',
      'text-subheading',
      'text-label',
      'text-caption',
      'text-overline',
      'text-metric',
      'text-metric-sm',
    ]

    const sizes = new Map<string, string>()
    for (const step of steps) {
      sizes.set(step, await computeUtility(page, step, 'font-size'))
    }

    const bodySize = await computeUtility(page, 'text-body', 'font-size')

    for (const [step, size] of sizes) {
      // A missing token inherits, so equalling the body size is the signature
      // of a token that was never generated.
      if (step === 'text-body') continue
      expect(size, `${step} fell back to the inherited size`).not.toBe(bodySize)
    }
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
