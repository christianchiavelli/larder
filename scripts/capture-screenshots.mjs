import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3210'
const OUT_DIR = 'docs/screenshots'

const VIEWPORT = { width: 1440, height: 900 }

async function openExport(page) {
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await page.locator('[data-testid="export-count"]', { hasText: /\d/ }).waitFor()
}

const SHOTS = [
  { name: 'landing-dark', path: '/', scheme: 'dark', fullPage: false },
  { name: 'overview-light', path: '/overview', scheme: 'light', fullPage: true },
  { name: 'overview-dark', path: '/overview', scheme: 'dark', fullPage: true },
  { name: 'directory-light', path: '/products', scheme: 'light', fullPage: false },
  { name: 'product-dark', path: '/products/3017620425035', scheme: 'dark', fullPage: false },
  {
    name: 'export-light',
    path: '/products?q=chocolate&brand=milka',
    scheme: 'light',
    fullPage: false,
    prepare: openExport,
  },
  {
    name: 'export-too-many-dark',
    path: '/products?q=chocolate',
    scheme: 'dark',
    fullPage: false,
    prepare: openExport,
  },
]

await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()

for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: shot.scheme,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })

  const page = await context.newPage()
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle' })

  await page.waitForTimeout(1200)

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

  if (shot.prepare) {
    await shot.prepare(page)
    await page.waitForTimeout(400)
  }

  await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png`, fullPage: shot.fullPage })
  console.log(`captured ${shot.name}`)

  await context.close()
}

await browser.close()
