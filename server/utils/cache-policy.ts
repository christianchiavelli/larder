import type { CachedEventHandlerOptions } from 'nitropack'

/**
 * Upstream is rate limited and its data moves on the order of days.
 *
 * The development bypass is centralised so it cannot be applied to some routes
 * and forgotten on others: a cached response outliving the code that produced it
 * makes editing a mapper appear to do nothing.
 */
export function upstreamCache(
  options: CachedEventHandlerOptions & { name: string; maxAge: number },
): CachedEventHandlerOptions {
  return {
    swr: true,
    ...options,
    // Production caches; development always executes the handler. Nitro reads
    // this before touching storage, so no stale entry is consulted or written.
    shouldBypassCache: () => import.meta.dev,
  }
}
