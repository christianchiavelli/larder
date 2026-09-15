/**
 * Regenerates the screenshots used in the README.
 *
 * A script rather than images dropped in by hand, so they can be refreshed
 * after a UI change instead of quietly ageing into a picture of a version that
 * no longer exists. Run against a production build:
 *
 *   pnpm run build
 *   node .output/server/index.mjs &
 *   pnpm run screenshots
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3210'
const OUT_DIR = 'docs/screenshots'

/** Wide enough for the directory's three-column grid without being a billboard. */
const VIEWPORT = { width: 1440, height: 900 }

const SHOTS = [
  { name: 'overview-light', path: '/', scheme: 'light', fullPage: true },
  { name: 'overview-dark', path: '/', scheme: 'dark', fullPage: true },
  { name: 'directory-light', path: '/products', scheme: 'light', fullPage: false },
  { name: 'product-dark', path: '/products/3017620425035', scheme: 'dark', fullPage: false },
]

await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()

for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: shot.scheme,
    // Keeps file sizes reasonable; these are README illustrations, not assets.
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })

  const page = await context.newPage()
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle' })

  // Charts animate in on a canvas, so a screenshot taken at networkidle can
  // catch them mid-draw.
  await page.waitForTimeout(1200)

  /**
   * Refuse to capture an unstyled page.
   *
   * Rebuilding while the production server is already running leaves it serving
   * HTML that points at asset hashes the build has replaced, so every
   * stylesheet 404s. The page still renders, the script still succeeds, and the
   * README quietly gains a screenshot of the site with no CSS. Failing loudly
   * here is the difference between a five-second fix and shipping that.
   */
  const styled = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.className = 'bg-chrome'
    probe.style.position = 'absolute'
    document.body.append(probe)
    const applied = getComputedStyle(probe).backgroundColor !== 'rgba(0, 0, 0, 0)'
    probe.remove()
    return applied
  })

  if (!styled) {
    throw new Error(
      `${shot.name}: the page loaded without stylesheets. Restart the production ` +
        `server so it picks up the current build, then run this again.`,
    )
  }

  await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png`, fullPage: shot.fullPage })
  console.log(`captured ${shot.name}`)

  await context.close()
}

await browser.close()
