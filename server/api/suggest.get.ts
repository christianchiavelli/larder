import { getQuery } from 'h3'
import type { Suggestion } from '#shared/domain/search'
import { suggestTaxonomy } from '~~/server/services/suggest'
import { useSearchClient } from '~~/server/utils/upstream-client'
import { upstreamCache } from '~~/server/utils/cache-policy'

/**
 * Taxonomy autocomplete, backing the filter inputs.
 *
 * Fired on keystroke, against the endpoint with upstream's tightest published
 * ceiling. The cache is keyed on the prefix, which is what makes a keystroke
 * burst collapse into one upstream call per distinct prefix across all users.
 *
 * The lookup itself lives in ~~/server/services/suggest.
 */
export default defineCachedEventHandler(
  async (event): Promise<Suggestion[]> => suggestTaxonomy(useSearchClient(), getQuery(event)),
  upstreamCache({
    name: 'taxonomy-suggest',
    // Taxonomies change on the order of weeks. This is the cheapest route to
    // cache hard and the most expensive one to call.
    maxAge: 60 * 60 * 24,
    getKey: (event) => {
      const query = getQuery(event)
      const term = String(query.q ?? '')
        .trim()
        .toLowerCase()
      const taxonomy = String(query.taxonomy ?? 'category')
      const limit = String(query.limit ?? 8)
      return `${taxonomy}__${limit}__${term}`.replace(/[^a-z0-9_-]/gi, '_')
    },
  }),
)
