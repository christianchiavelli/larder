import type { CachedEventHandlerOptions } from 'nitropack'

/**
 * Shared cache policy for routes that read from upstream.
 *
 * Every route here is cached for the same reason: upstream is rate limited and
 * its data moves on the order of days. The policy is centralised so that
 * reason is stated once, and so the development bypass cannot be applied to
 * some routes and forgotten on others.
 *
 * The bypass is not a convenience. Without it a cached response outlives the
 * code that produced it, so editing a mapper appears to change nothing for the
 * full maxAge and the obvious conclusion, that the edit did not work, is wrong.
 * That is an expensive way to lose an afternoon.
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
