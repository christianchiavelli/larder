import { expect, test, type Page } from '@playwright/test'

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

async function findBarInterior(page: Page, canvasIndex: number): Promise<Point | null> {
  return page.evaluate(
    ([index]) => {
      const canvas = document.querySelectorAll('figure canvas')[index!] as HTMLCanvasElement
      const context = canvas.getContext('2d')!
      const { width, height } = canvas
      const image = context.getImageData(0, 0, width, height).data

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

      return best && best.length > 40 ? { x: best.x, y: best.y } : null
    },
    [canvasIndex] as const,
  )
}

test.describe('charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview')
    await page.locator('figure canvas').first().waitFor()
    await page.waitForTimeout(1500)
  })

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

      await page.mouse.move(0, 0)
      await page.waitForTimeout(150)
    }
  })

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

    expect(result.viaComputedStyle).toMatch(/^oklch\(/)
    expect(result.viaFillStyle).toMatch(/^oklch\(/)

    expect(result.viaRaster).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  test('charts expose their figures as a table for readers the canvas excludes', async ({
    page,
  }) => {
    const tables = page.locator('figure table')

    expect(await tables.count()).toBeGreaterThan(0)
    await expect(tables.first().locator('tbody tr').first()).toHaveCount(1)
  })

  test('the accessible table takes up no room in the layout', async ({ page }) => {
    const hidden = page.locator('figure .sr-only')
    expect(await hidden.count()).toBeGreaterThan(0)

    const heights = await hidden.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    )

    for (const height of heights) expect(height).toBeLessThanOrEqual(1)

    const overshoot = await page.evaluate(() => {
      const footer = document.querySelector('footer')!
      const footerBottom = footer.getBoundingClientRect().bottom + scrollY
      return document.documentElement.scrollHeight - footerBottom
    })

    expect(overshoot).toBeLessThanOrEqual(1)
  })

  test('no figure on the overview renders as NaN', async ({ page }) => {
    const figures = await page.locator('[data-numeric]').allInnerTexts()

    expect(figures.length, 'the overview rendered no figures').toBeGreaterThan(0)

    for (const figure of figures) {
      expect(figure, 'a figure is not a number').toMatch(/^[\d,.]+$/)
    }
  })

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
