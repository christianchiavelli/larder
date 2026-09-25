import type { Page } from '@playwright/test'

export function holdRequests(page: Page, pathname: string): Promise<() => void> {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))

  return page
    .route(
      (url) => url.pathname === pathname,
      async (route) => {
        await held
        await route.continue()
      },
    )
    .then(() => release)
}
