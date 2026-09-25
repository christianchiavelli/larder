import { z } from 'zod'
import { toCountryTag } from '#shared/domain/country'
import { TAXONOMIES, toTaxonomyTag, type TaxonomyName } from '#shared/domain/taxonomy'
import type { Suggestion } from '#shared/domain/search'
import { toUpstreamError } from '~~/server/utils/upstream-error'
import type { UpstreamClient } from '~~/server/utils/upstream-client'

const suggestQuerySchema = z.object({
  q: z.string().trim().min(2).max(60),

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
      fuzziness: 1,
    })
  } catch (error) {
    throw toUpstreamError(error, { service: 'search-a-licious', operation: 'GET /autocomplete' })
  }

  const response = upstreamSuggestSchema.safeParse(raw)

  if (!response.success) return []

  return response.data.options.map((option): Suggestion => {
    const taxonomyName = option.taxonomy_name ?? taxonomy
    const toTag = taxonomyName === 'country' ? toCountryTag : toTaxonomyTag

    return {
      id: option.id,
      label: toTag(option.id, option.text).label,
      taxonomy: taxonomyName,
    }
  })
}

function quotaFor(limit: number, taxonomies: number): number {
  return Math.ceil(limit / taxonomies) + 1
}

function interleave(lists: Suggestion[][]): Suggestion[] {
  const merged: Suggestion[] = []
  const seen = new Set<string>()
  const longest = Math.max(0, ...lists.map((list) => list.length))

  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      const suggestion = list[index]
      if (!suggestion || seen.has(suggestion.id)) continue
      seen.add(suggestion.id)
      merged.push(suggestion)
    }
  }

  return merged
}
