import type { CachedEventHandlerOptions } from 'nitropack'

export function upstreamCache(
  options: CachedEventHandlerOptions & { name: string; maxAge: number },
): CachedEventHandlerOptions {
  return {
    swr: true,
    ...options,
    shouldBypassCache: () => import.meta.dev,
  }
}
