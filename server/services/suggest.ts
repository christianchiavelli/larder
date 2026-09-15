import { z } from 'zod'
import { TAXONOMIES, toTaxonomyTag, type TaxonomyName } from '#shared/domain/taxonomy'
import type { Suggestion } from '#shared/domain/search'
import { toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/**
 * Taxonomy autocomplete.
 *
 * See the note in ./product-search.ts on the service/route split.
 *
 * One upstream call per taxonomy, merged here. Upstream does accept a list of
 * taxonomies in a single call and it is not usable: the ranking is global, so
 * the highest-scoring taxonomy fills the whole response. "choc" across
 * categories, brands and labels returns eight brands and no category.
 */

const suggestQuerySchema = z.object({
  /**
   * Two characters is the floor. A single letter matches most of a taxonomy,
   * which suggests nothing useful and spends a call against the endpoint with
   * upstream's tightest published ceiling.
   */
  q: z.string().trim().min(2).max(60),

  /**
   * One or more taxonomies, as a repeated parameter or a comma-joined string.
   *
   * Upstream accepts a list too, and ranks the whole list together, so a single
   * call returns whichever taxonomy happens to score highest and nothing else:
   * "choc" across categories, brands and labels comes back as eight brands. The
   * merge below exists because of that.
   */
  taxonomy: z
    .preprocess(
      (value) =>
        value === undefined || value === ''
          ? undefined
          : (Array.isArray(value) ? value : String(value).split(',')).map((entry) =>
              String(entry).trim(),
            ),
      z.array(z.enum(TAXONOMIES)).min(1).max(TAXONOMIES.length),
    )
    .default(['category', 'brand']),

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

  const lists = await Promise.all(
    taxonomy.map((name) => suggestOne(client, q, name, quotaFor(limit, taxonomy.length))),
  )

  return interleave(lists).slice(0, limit)
}

/** One call, one taxonomy. */
async function suggestOne(
  client: UpstreamClient,
  q: string,
  taxonomy: TaxonomyName,
  size: number,
): Promise<Suggestion[]> {
  let raw: unknown
  try {
    raw = await client.get('/autocomplete', {
      q,
      taxonomy_names: taxonomy,
      lang: 'en',
      size,
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

/**
 * How many to ask each taxonomy for.
 *
 * A share of the total plus one, so that when a taxonomy returns fewer than its
 * share the others have a spare to fill the list with. Asking each for the full
 * limit would be the obvious alternative and would multiply the load on the
 * endpoint with upstream's tightest published ceiling.
 */
function quotaFor(limit: number, taxonomies: number): number {
  return Math.ceil(limit / taxonomies) + 1
}

/**
 * Takes one from each list in turn.
 *
 * Round-robin rather than concatenation, because concatenating puts every
 * category above every brand and the reader sees one taxonomy until they
 * scroll. Each list arrives already ranked, so position within a list is
 * upstream's judgement and position between lists is ours.
 */
function interleave(lists: Suggestion[][]): Suggestion[] {
  const merged: Suggestion[] = []
  const seen = new Set<string>()
  const longest = Math.max(0, ...lists.map((list) => list.length))

  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      const suggestion = list[index]
      // The same id can appear in two taxonomies. Keeping both would show the
      // reader one entry twice and have the two apply different filters.
      if (!suggestion || seen.has(suggestion.id)) continue
      seen.add(suggestion.id)
      merged.push(suggestion)
    }
  }

  return merged
}
