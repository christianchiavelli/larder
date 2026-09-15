import { expect, test, type Page } from '@playwright/test'

/**
 * Chart rendering, checked against the pixels.
 *
 * Charts draw to a canvas, so there is no element to assert on and no computed
 * style to read. Everything below therefore samples the rendered image, which
 * is unusual for a test suite and is the only way to catch this particular
 * class of bug.
 *
 * It exists because of one that shipped: the palette is authored in OKLCH, a
 * canvas accepts `oklch()` so every chart rendered correctly, but ECharts has
 * to parse a colour to derive its hover state and zrender's parser does not
 * handle OKLCH. The derived colour came out transparent and the bar under the
 * pointer disappeared. Types, lint, unit tests and every other end-to-end spec
 * passed. A person found it by moving a mouse.
 */

interface Point {
  x: number
  y: number
}

/** Reads one pixel of a canvas, in canvas-local coordinates. */
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
 * Finds a point well inside the longest horizontal run of non-background
 * pixels, which for these charts is the middle of a bar.
 *
 * Derived from the image rather than hard-coded, so the test survives a layout
 * change instead of silently pointing at empty space and passing.
 */
async function findBarInterior(page: Page, canvasIndex: number): Promise<Point | null> {
  return page.evaluate(
    ([index]) => {
      const canvas = document.querySelectorAll('figure canvas')[index!] as HTMLCanvasElement
      const context = canvas.getContext('2d')!
      const { width, height } = canvas
      const image = context.getImageData(0, 0, width, height).data

      // The top-left corner is plot background in every one of these charts.
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
   * The regression this file was written for.
   *
   * A hovered bar is allowed to change shade; what it may not do is disappear.
   * Comparing against the background colour rather than against the original
   * colour is deliberate, because emphasis legitimately alters the fill.
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

      // Move away so the next chart starts from a clean state.
      await page.mouse.move(0, 0)
      await page.waitForTimeout(150)
    }
  })

  /**
   * The root cause, asserted directly.
   *
   * Pins down why the conversion has to rasterise rather than read a computed
   * value. Both obvious shortcuts hand OKLCH straight back: a computed `color`
   * preserves the authored colour space, and so does `ctx.fillStyle`. Only
   * painting a pixel produces sRGB.
   *
   * Worth asserting because the shortcuts look like they work. Swapping the
   * rasteriser for `getComputedStyle` would leave every chart rendering
   * perfectly, screenshot and all, and break hover.
   */
  test('the tokens are OKLCH and only rasterising converts them', async ({ page }) => {
    const result = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--viz-1').trim()

      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden'
      probe.style.color = raw
      document.body.append(probe)
      const viaComputedStyle = getComputedStyle(probe).color
      probe.remove()

      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.fillStyle = raw
      const viaFillStyle = String(context.fillStyle)
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const viaRaster = `rgb(${r}, ${g}, ${b})`

      return { raw, viaComputedStyle, viaFillStyle, viaRaster }
    })

    // The palette is authored in OKLCH. If this stops being true the whole
    // conversion is unnecessary and should go.
    expect(result.raw).toMatch(/^oklch\(/)

    // Neither shortcut converts.
    expect(result.viaComputedStyle).toMatch(/^oklch\(/)
    expect(result.viaFillStyle).toMatch(/^oklch\(/)

    // Rasterising does, and produces something zrender can parse.
    expect(result.viaRaster).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  test('charts expose their figures as a table for readers the canvas excludes', async ({
    page,
  }) => {
    // A canvas is invisible to assistive technology. Every chart ships the same
    // numbers as a real table, visually hidden but reachable.
    const tables = page.locator('figure table')

    expect(await tables.count()).toBeGreaterThan(0)
    await expect(tables.first().locator('tbody tr').first()).toHaveCount(1)
  })
})
