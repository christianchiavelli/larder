import { getQuery } from 'h3'
import type { Suggestion } from '#shared/domain/search'
import { suggestTaxonomy } from '~~/server/services/suggest'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

export default defineCachedEventHandler(
  async (event): Promise<Suggestion[]> => suggestTaxonomy(useSearchClient(), getQuery(event)),
  upstreamCache({
    name: 'taxonomy-suggest',
    maxAge: 60 * 60 * 24,
    getKey: (event) => {
      const query = getQuery(event)
      const term = String(query.q ?? '')
        .trim()
        .toLowerCase()
      const taxonomy = (Array.isArray(query.taxonomy) ? query.taxonomy : [query.taxonomy ?? ''])
        .flatMap((entry) => String(entry).split(','))
        .map((entry) => entry.trim())
        .filter(Boolean)
        .sort()
        .join('-')
      const limit = String(query.limit ?? 8)
      return `${taxonomy || 'default'}__${limit}__${term}`.replace(/[^a-z0-9_-]/gi, '_')
    },
  }),
)
