/**
 * Captures the README screenshots from the production build, served by the
 * real Nitro server against the live Open Food Facts:
 *
 *   pnpm run screenshots                 builds, then every shot
 *   pnpm run screenshots product-dark    builds, then only the shots named
 *
 * The server is started here, on a port nothing else holds, and stopped when
 * the captures are done: nothing left running from an older build can answer
 * instead.
 */
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { chromium } from '@playwright/test'

const SERVER = '.output/server/index.mjs'
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
  // A Brazilian product, so the record has a Portuguese name and ingredients to show.
  {
    name: 'product-pt-light',
    path: '/pt/products/7891000100103',
    scheme: 'light',
    fullPage: false,
  },
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

/** A port the system has just handed out, so free a moment ago. */
async function freePort() {
  const probe = createServer().listen(0)
  await once(probe, 'listening')
  const { port } = probe.address()
  probe.close()
  return port
}

/** Starts the production server, and resolves once it answers a page. */
async function serve() {
  const port = await freePort()
  const server = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(port), NITRO_PORT: String(port) },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  const exited = once(server, 'exit')
  const url = `http://localhost:${port}`
  const stop = async () => {
    if (server.exitCode !== null) return
    server.kill()
    await exited
  }

  const answers = () =>
    fetch(url).then(
      ({ ok }) => ok,
      () => false,
    )
  const deadline = Date.now() + 60_000
  while (!(await answers())) {
    if (server.exitCode !== null) throw new Error(`${SERVER} exited with ${server.exitCode}`)
    if (Date.now() > deadline) {
      await stop()
      throw new Error(`${SERVER} did not answer on ${url} within a minute`)
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return { url, stop }
}

/**
 * Every chart drawn and still. Charts render in the browser only, each into a
 * canvas inside its figure, and play an entry animation there: a chart whose
 * canvas has not changed for ten frames running has finished it.
 */
async function chartsDrawn(page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('figure:has(> figcaption)')].every((figure) =>
      figure.querySelector('canvas'),
    ),
  )
  await page.evaluate(async () => {
    const canvases = [...document.querySelectorAll('figure canvas')]
    const picture = () => canvases.map((canvas) => canvas.toDataURL()).join()
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    let last = picture()
    for (let still = 0; still < 10;) {
      await frame()
      const now = picture()
      still = now === last ? still + 1 : 0
      last = now
    }
  })
}

/** Transitions run to their end. Animations are left alone: a skeleton's pulse never ends. */
async function transitionsDone(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
}

async function capture(browser, url, shot) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: shot.scheme,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(`${url}${shot.path}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await chartsDrawn(page)

  await shot.prepare?.(page)
  await transitionsDone(page)

  await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png`, fullPage: shot.fullPage })
  console.log(`captured ${shot.name}`)

  await context.close()
}

const only = new Set(process.argv.slice(2))
const unknown = [...only].filter((name) => !SHOTS.some((shot) => shot.name === name))
if (unknown.length) throw new Error(`No such shot: ${unknown.join(', ')}`)

await mkdir(OUT_DIR, { recursive: true })
const server = await serve()
try {
  const browser = await chromium.launch()
  try {
    for (const shot of SHOTS.filter(({ name }) => only.size === 0 || only.has(name))) {
      await capture(browser, server.url, shot)
    }
  } finally {
    await browser.close()
  }
} finally {
  await server.stop()
}
