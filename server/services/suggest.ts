import { z } from 'zod'
import { TAXONOMIES, toTaxonomyTag } from '#shared/domain/taxonomy'
import type { Suggestion } from '#shared/domain/search'
import { toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/** Taxonomy autocomplete. See the note in ./product-search.ts on the split. */

export const suggestQuerySchema = z.object({
  /**
   * Two characters is the floor. A single letter matches most of a taxonomy,
   * which suggests nothing useful and spends a call against the endpoint with
   * upstream's tightest published ceiling.
   */
  q: z.string().trim().min(2).max(60),
  taxonomy: z.enum(TAXONOMIES).default('category'),
  limit: z.coerce.number().int().min(1).max(20).catch(8).default(8),
})

const upstreamSuggestSchema = z.looseObject({
  options: z
    .array(
      z.looseObject({
        id: z.string(),
        text: z.string().nullish(),
        taxonomy_name: z.string().nullish(),
      }),
    )
    .default([]),
})

export async function suggestTaxonomy(
  client: UpstreamClient,
  rawQuery: unknown,
): Promise<Suggestion[]> {
  const parsed = suggestQuerySchema.safeParse(rawQuery)

  // Too short is not an error, it is the normal state of an input someone has
  // just started typing into. An empty list renders correctly; a 400 would put
  // a red line in the console on every first keystroke.
  if (!parsed.success) return []

  const { q, taxonomy, limit } = parsed.data

  let raw: unknown
  try {
    raw = await client.get('/autocomplete', {
      q,
      taxonomy_names: taxonomy,
      lang: 'en',
      size: limit,
      // Upstream matches on a completion field, so a typo returns nothing at
      // all. One edit of tolerance covers the common transposition without
      // letting unrelated terms in.
      fuzziness: 1,
    })
  } catch (error) {
    throw toUpstreamError(error, { service: 'search-a-licious', operation: 'GET /autocomplete' })
  }

  const response = upstreamSuggestSchema.safeParse(raw)

  // A suggestion list is an enhancement. If upstream changes shape here, an
  // empty dropdown is a better outcome than a failed page, and the schema
  // mismatch still surfaces in the search route, which does throw.
  if (!response.success) return []

  return response.data.options.map((option): Suggestion => ({
    id: option.id,
    label: toTaxonomyTag(option.id, option.text).label,
    taxonomy: option.taxonomy_name ?? taxonomy,
  }))
}
