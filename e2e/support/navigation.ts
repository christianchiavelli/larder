import type { Page, Response } from '@playwright/test'
import { hydrated } from './hydration'

/**
 * Opens a page and hands it back ready to be used.
 *
 * `page.goto` waits for the load event, and the load event waits for every image. The
 * photographs on these pages come from Open Food Facts' own image host, so a slow day there
 * became a thirty-second navigation timeout in tests that only read the DOM — somebody
 * else's server reported as a fault in ours.
 *
 * So the document is waited for, and nothing else. What the old wait for the load event also
 * gave, without anyone asking for it, was time for the app to hydrate, which is the moment a
 * click stops being lost. That is asked for on purpose here instead.
 *
 * A test that opens a page with JavaScript off cannot wait for that mark, and calls
 * `page.goto` itself.
 */
export async function open(page: Page, path: string): Promise<Response | null> {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
  await hydrated(page)

  return response
}

/** Resolves once every font has loaded, for a test that measures where things ended up. */
export async function fontsSettled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}
