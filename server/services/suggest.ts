import { z } from 'zod'
import { TAXONOMIES, toTaxonomyTag, type TaxonomyName } from '#shared/domain/taxonomy'
import type { Suggestion } from '#shared/domain/search'
import { toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

/**
 * One upstream call per taxonomy, merged here. Upstream accepts a list in one
 * call but ranks it globally, so the highest-scoring taxonomy fills the whole
 * response: "choc" across categories, brands and labels returns eight brands.
 */

const suggestQuerySchema = z.object({
  /** A single letter matches most of a taxonomy and suggests nothing useful. */
  q: z.string().trim().min(2).max(60),

  /** Repeated parameter or comma-joined string. */
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

  // Too short is the normal state of an input someone just started typing in.
  if (!parsed.success) return []

  const { q, taxonomy, limit } = parsed.data

  const lists = await Promise.all(
    taxonomy.map((name) => suggestOne(client, q, name, quotaFor(limit, taxonomy.length))),
  )

  return interleave(lists).slice(0, limit)
}

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
      // A completion field returns nothing at all for a typo.
      fuzziness: 1,
    })
  } catch (error) {
    throw toUpstreamError(error, { service: 'search-a-licious', operation: 'GET /autocomplete' })
  }

  const response = upstreamSuggestSchema.safeParse(raw)

  // An empty dropdown beats a failed page; the search route still throws.
  if (!response.success) return []

  return response.data.options.map((option): Suggestion => ({
    id: option.id,
    label: toTaxonomyTag(option.id, option.text).label,
    taxonomy: option.taxonomy_name ?? taxonomy,
  }))
}

/**
 * A share plus one, so a taxonomy returning fewer than its share leaves the
 * others a spare. Asking each for the full limit multiplies load on the
 * endpoint with upstream's tightest published ceiling.
 */
function quotaFor(limit: number, taxonomies: number): number {
  return Math.ceil(limit / taxonomies) + 1
}

/**
 * Round-robin rather than concatenation, which would put every category above
 * every brand and show one taxonomy until the reader scrolls.
 */
function interleave(lists: Suggestion[][]): Suggestion[] {
  const merged: Suggestion[] = []
  const seen = new Set<string>()
  const longest = Math.max(0, ...lists.map((list) => list.length))

  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      const suggestion = list[index]
      // The same id in two taxonomies would list one entry twice.
      if (!suggestion || seen.has(suggestion.id)) continue
      seen.add(suggestion.id)
      merged.push(suggestion)
    }
  }

  return merged
}
