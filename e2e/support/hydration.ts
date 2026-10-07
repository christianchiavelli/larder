import type { Page } from '@playwright/test'

/** Waits for the mark app/plugins/hydration-marker.client.ts puts on a page once it hydrates. */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForSelector('html[data-hydrated]', { state: 'attached' })
}
