import { expect, test, type Page } from '@playwright/test'

/**
 * Tailwind generates a utility only if it finds the class name while scanning
 * source. Nuxt sets the Vite root to the app directory, so nothing under
 * `layers/` was scanned and every design-system-only utility was dead: markup
 * intact, build green, elements unstyled. The `@source` block in ui.css is the
 * fix and this spec is what notices if the paths drift.
 */

async function selectors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []

    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) found.push(rule.selectorText)
        // Utilities nest inside @layer and @media.
        else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
      }
    }

    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules)
      } catch {
        // A cross-origin sheet is not one of ours.
      }
    }

    return found
  })
}

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
    // Only tokens something uses: Tailwind generates on demand, so an unused
    // one fails for the unrelated reason that nobody referenced it.
    expect(await computeUtility(page, 'rounded-card', 'border-radius')).not.toBe('0px')
    expect(await computeUtility(page, 'rounded-control', 'border-radius')).not.toBe('0px')
  })

  /**
   * The rule existing, not each step having a unique size: `text-subheading`
   * and `text-body` share a size and differ only in weight.
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

  test('headings are serif and figures are sans', async ({ page }) => {
    expect(await computeUtility(page, 'text-title', 'font-family')).toContain('Lora')
    expect(await computeUtility(page, 'text-heading', 'font-family')).toContain('Lora')
    expect(await computeUtility(page, 'text-body', 'font-family')).toContain('Open Sans')
    // Lora's numerals are old-style, so a metric set in it could not line up in
    // a column.
    expect(await computeUtility(page, 'text-metric', 'font-family')).toContain('Open Sans')
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

/**
 * Outer radius = inner radius + the gap between the edges, or the curves do not
 * run parallel and the frame reads as a square around a rounded chip. Asserted
 * as the relationship, so changing the padding alone is what fails.
 */
test('the grade filter frame is concentric with the badge inside it', async ({ page }) => {
  await page.goto('/products')

  const measured = await page
    .getByRole('button', { name: /Nutri-Score A,/ })
    .first()
    .evaluate((button) => {
      const badge = button.querySelector('[role="img"]')!
      const outer = button.getBoundingClientRect()
      const inner = badge.getBoundingClientRect()

      return {
        outerRadius: parseFloat(getComputedStyle(button).borderTopLeftRadius),
        innerRadius: parseFloat(getComputedStyle(badge).borderTopLeftRadius),
        inset: (outer.width - inner.width) / 2,
        square: Math.abs(outer.width - outer.height) < 0.5,
      }
    })

  expect(measured.outerRadius).toBeCloseTo(measured.innerRadius + measured.inset, 1)

  // An inline child sits in a line box taller than itself, which made a square
  // badge wear a rectangle.
  expect(measured.square, 'the frame is not square').toBe(true)
})

/**
 * Neutral because the ring wraps a colour scale, and an accent hue means
 * nothing beside hues that mean everything. Visible because the ring is the
 * only thing separating on from off, and WCAG 1.4.11 puts that floor at 3:1.
 * Asserted on the filter rather than the token: accent is right for pagination.
 */
test('the chosen grade is marked in a neutral colour, in both themes', async ({ page }) => {
  await page.goto('/products')
  await page
    .getByRole('button', { name: /Nutri-Score A,/ })
    .first()
    .click()
  await expect(page).toHaveURL(/nutriScore=a/)

  // The frame animates, so a read right after the flip lands mid-interpolation.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important }' })

  const measure = () =>
    page
      .getByRole('button', { name: /Nutri-Score A,/ })
      .first()
      .evaluate((button) => {
        const parse = (value: string) =>
          value
            .match(/\d+(\.\d+)?/g)!
            .slice(0, 3)
            .map(Number)

        const luminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((channel) => {
            const c = channel / 255
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          }) as [number, number, number]
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        const contrast = (a: number[], b: number[]) => {
          const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
          return (high + 0.05) / (low + 0.05)
        }

        const border = parse(getComputedStyle(button).borderTopColor)
        const fill = parse(getComputedStyle(button).backgroundColor)
        const [min, max] = [Math.min(...border), Math.max(...border)]

        return {
          // HSL saturation. Accent blue reads 100, a cool grey reads about 11.
          saturation: (max - min) / (255 - Math.abs(max + min - 255)),
          contrast: contrast(border, fill),
        }
      })

  const light = await measure()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await measure()

  for (const [theme, measured] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    expect(measured.saturation, `the ${theme} ring is not neutral`).toBeLessThan(0.25)
    expect(measured.contrast, `the ${theme} ring is too faint to read as a state`).toBeGreaterThan(
      3,
    )
  }
})

/**
 * The product page once drew its own NOVA chip with `text-white` fixed, which
 * on the lighter yellow is 1.95:1 against a floor of 4.5, and nothing caught it.
 *
 * Nutri-Score is excluded on purpose: its colours are prescribed, grade E is
 * 4.15, and darkening it would pass by misrepresenting a regulated mark. Those
 * are pinned to their official values above, and the shortfall is in the README.
 */
test('every badge the app colours itself is readable on its own fill', async ({
  page,
  request,
}) => {
  const directory = await request.get('/api/products?nova=2')
  const [product] = (await directory.json()).items
  expect(product, 'no product came back to check').toBeTruthy()

  for (const url of ['/products', `/products/${product.code}`]) {
    await page.goto(url)
    await page.locator('[role="img"]').first().waitFor()

    const measured = await page.locator('[role="img"]').evaluateAll((nodes) =>
      nodes
        .filter((node) => !/^Nutri-Score/.test(node.getAttribute('aria-label') || ''))
        .map((node) => {
          const style = getComputedStyle(node)
          const parse = (value: string) =>
            (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)

          const luminance = (rgb: number[]) => {
            const [r, g, b] = rgb.map((channel) => {
              const c = channel / 255
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            }) as [number, number, number]
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
          }

          const ink = parse(style.color)
          const fill = parse(style.backgroundColor)
          const [high, low] = [luminance(ink), luminance(fill)].sort((a, b) => b - a) as [
            number,
            number,
          ]

          return {
            label: node.getAttribute('aria-label') || '',
            contrast: (high + 0.05) / (low + 0.05),
          }
        }),
    )

    expect(measured.length, `${url} rendered no badge to check`).toBeGreaterThan(0)

    for (const badge of measured) {
      expect(badge.contrast, `${badge.label} on ${url}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})
