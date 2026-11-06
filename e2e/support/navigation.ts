import type { Page, Response } from '@playwright/test'
import { hydrated } from './hydration'

/**
 * Opens a page and hands it back ready to be clicked.
 *
 * `goto` waits for the load event, which waits for every photograph — and those come from
 * Open Food Facts' image host. The document is enough; hydration is what makes a click land.
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
