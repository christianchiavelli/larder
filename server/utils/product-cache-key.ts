import type { ProductQuery } from '#shared/domain/search'

export function filterCacheKey(query: ProductQuery): string {
  const parts = [
    query.q,
    [...query.category].sort().join('|'),
    [...query.brand].sort().join('|'),
    [...query.country].sort().join('|'),
    [...query.label].sort().join('|'),
    [...query.nutriScore].sort().join('|'),
    [...query.nova].sort().join('|'),
  ]

  return parts.join('__').replace(/[^a-zA-Z0-9_|.-]/g, '_')
}
