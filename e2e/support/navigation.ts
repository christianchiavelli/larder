import type { Page } from '@playwright/test'

/**
 * Opens a page without waiting for its photographs.
 *
 * `page.goto` waits for the load event, and the load event waits for every image. The
 * photographs on these pages come from Open Food Facts' own image host, so a slow day there
 * became a thirty-second navigation timeout in three tests that only read the DOM — somebody
 * else's server reported as a fault in ours.
 *
 * A test that is about the photographs asks for them itself. The rest go on as soon as the
 * document is there, and wait for whatever they actually need.
 */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
}

/** Resolves once every font has loaded, for a test that measures where things ended up. */
export async function fontsSettled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}
