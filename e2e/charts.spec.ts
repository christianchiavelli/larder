import { expect, test, type Page } from '@playwright/test'

/**
 * A canvas has no element to assert on, so these sample the rendered image.
 *
 * It exists because of a bug that shipped: the palette was authored in OKLCH, a
 * canvas accepts it, but ECharts parses colours to derive hover states and
 * zrender does not handle OKLCH. The bar under the pointer disappeared while
 * everything else passed. A person found it by moving a mouse.
 */

interface Point {
  x: number
  y: number
}

async function readPixel(page: Page, canvasIndex: number, point: Point): Promise<string> {
  return page.evaluate(
    ([index, x, y]) => {
      const canvas = document.querySelectorAll('figure canvas')[index!] as HTMLCanvasElement
      const context = canvas.getContext('2d')!
      const { data } = context.getImageData(x!, y!, 1, 1)
      return `${data[0]},${data[1]},${data[2]},${data[3]}`
    },
    [canvasIndex, Math.round(point.x), Math.round(point.y)] as const,
  )
}

/**
 * The middle of the longest horizontal run of non-background pixels, which is
 * the middle of a bar. Derived from the image, so a layout change does not
 * leave the probe pointing at empty space and passing.
 */
async function findBarInterior(page: Page, canvasIndex: number): Promise<Point | null> {
  return page.evaluate(
    ([index]) => {
      const canvas = document.querySelectorAll('figure canvas')[index!] as HTMLCanvasElement
      const context = canvas.getContext('2d')!
      const { width, height } = canvas
      const image = context.getImageData(0, 0, width, height).data

      // Plot background in every one of these charts.
      const background = [image[0], image[1], image[2]]
      const isBackground = (offset: number) =>
        Math.abs(image[offset]! - background[0]!) < 12 &&
        Math.abs(image[offset + 1]! - background[1]!) < 12 &&
        Math.abs(image[offset + 2]! - background[2]!) < 12

      let best: { x: number; y: number; length: number } | null = null

      for (let y = 0; y < height; y += 2) {
        let runStart = -1

        for (let x = 0; x <= width; x++) {
          const solid = x < width && !isBackground((y * width + x) * 4)

          if (solid && runStart === -1) runStart = x
          else if (!solid && runStart !== -1) {
            const length = x - runStart
            if (length > (best?.length ?? 0)) {
              best = { x: runStart + Math.floor(length / 2), y, length }
            }
            runStart = -1
          }
        }
      }

      // Anything shorter than this is an axis label or a grid line, not a bar.
      return best && best.length > 40 ? { x: best.x, y: best.y } : null
    },
    [canvasIndex] as const,
  )
}

test.describe('charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('figure canvas').first().waitFor()
    // Bars animate in from zero width.
    await page.waitForTimeout(1500)
  })

  /**
   * A hovered bar may change shade; it may not disappear. Compared against the
   * background rather than the original fill, since emphasis alters the fill.
   */
  test('a hovered bar stays visible', async ({ page }) => {
    const canvases = await page.locator('figure canvas').count()
    expect(canvases, 'no charts rendered').toBeGreaterThan(0)

    for (let index = 0; index < canvases; index++) {
      const target = await findBarInterior(page, index)
      if (!target) continue

      const background = await readPixel(page, index, { x: 1, y: 1 })
      const before = await readPixel(page, index, target)

      expect(before, `chart ${index}: probe did not land on a bar`).not.toBe(background)

      const box = await page.locator('figure canvas').nth(index).boundingBox()
      expect(box).not.toBeNull()

      await page.mouse.move(box!.x + target.x, box!.y + target.y)
      await page.waitForTimeout(400)

      const after = await readPixel(page, index, target)

      expect(after, `chart ${index}: the bar vanished under the pointer`).not.toBe(background)

      // So the next chart starts clean.
      await page.mouse.move(0, 0)
      await page.waitForTimeout(150)
    }
  })

  /**
   * The conversion itself, probed with an explicit OKLCH value rather than a
   * token, so it keeps testing the mechanism after the palette changes again.
   * It also rules out both shortcuts: a computed `color` and `ctx.fillStyle`
   * each preserve the authored colour space, and swapping in either would leave
   * every chart rendering perfectly and break hover.
   */
  test('a colour syntax zrender cannot parse survives the conversion', async ({ page }) => {
    const result = await page.evaluate(() => {
      const authored = 'oklch(0.6 0.15 250)'

      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden'
      probe.style.color = authored
      document.body.append(probe)
      const viaComputedStyle = getComputedStyle(probe).color
      probe.remove()

      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.fillStyle = authored
      const viaFillStyle = String(context.fillStyle)
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const viaRaster = `rgb(${r}, ${g}, ${b})`

      return { viaComputedStyle, viaFillStyle, viaRaster }
    })

    // Neither shortcut converts.
    expect(result.viaComputedStyle).toMatch(/^oklch\(/)
    expect(result.viaFillStyle).toMatch(/^oklch\(/)

    // Rasterising does, and produces something zrender can parse.
    expect(result.viaRaster).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  test('charts expose their figures as a table for readers the canvas excludes', async ({
    page,
  }) => {
    // A canvas is invisible to assistive technology.
    const tables = page.locator('figure table')

    expect(await tables.count()).toBeGreaterThan(0)
    await expect(tables.first().locator('tbody tr').first()).toHaveCount(1)
  })

  /**
   * A figure is a number or the em-dash meaning nothing was reported, never
   * NaN, which is what a headline prints when the field behind it is added to
   * one side of the boundary and not the other.
   */
  test('no figure on the overview renders as NaN', async ({ page }) => {
    const figures = await page.locator('[data-numeric]').allInnerTexts()

    expect(figures.length, 'the overview rendered no figures').toBeGreaterThan(0)

    for (const figure of figures) {
      expect(figure, 'a figure is not a number').toMatch(/^[\d,.]+$/)
    }
  })

  /**
   * Computed separately, and the headline used to name the buckets it summed:
   * the day the ungraded bucket became two, it went short by 71,025 products
   * without throwing. Asserted as a relationship, since the catalogue grows.
   */
  test('the headline counts the same catalogue the chart draws', async ({ page }) => {
    const table = page.locator('figure table').first()
    await table.locator('tbody tr').first().waitFor({ state: 'attached' })

    const fromChart = await table.locator('tbody tr').evaluateAll((rows) =>
      rows.reduce((sum, row) => {
        const cell = row.querySelectorAll('td, th')[1]
        return sum + Number((cell?.textContent ?? '0').replace(/[^0-9]/g, ''))
      }, 0),
    )

    const headline = await page
      .getByText('Products in catalogue')
      .locator('xpath=..')
      .innerText()
      .then((text) => Number(text.replace(/[^0-9]/g, '')))

    expect(fromChart).toBeGreaterThan(0)
    expect(headline).toBe(fromChart)
  })
})
