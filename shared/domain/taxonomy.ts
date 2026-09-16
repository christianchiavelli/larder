import { z } from 'zod'

/**
 * Taxonomy ids are language-prefixed (`en:sweet-spreads`). The prefix names the
 * language the term was authored in, not what you get back, and is part of the
 * entry's identity: strip it only when a human has to read the thing.
 */

export const TAXONOMIES = ['category', 'brand', 'label', 'country', 'additive'] as const
export type TaxonomyName = (typeof TAXONOMIES)[number]

export const taxonomyTagSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export type TaxonomyTag = z.infer<typeof taxonomyTagSchema>

// `.*` not `.+`, so `en:` parses as an empty slug rather than passing for an
// unprefixed id.
const TAG_ID_PATTERN = /^([a-z]{2,3}):(.*)$/

/** Title-casing these from a slug gives "Pdo" and "Fr Bio01". */
const CASING_OVERRIDES = new Map<string, string>([
  ['pdo', 'PDO'],
  ['pgi', 'PGI'],
  ['tsg', 'TSG'],
  ['gmo', 'GMO'],
  ['ue', 'EU'],
  ['eu', 'EU'],
  ['usa', 'USA'],
  ['uk', 'UK'],
  ['bio', 'Bio'],
  ['ab', 'AB'],
  ['rspo', 'RSPO'],
  ['msc', 'MSC'],
  ['asc', 'ASC'],
  ['utz', 'UTZ'],
  ['iso', 'ISO'],
  ['dop', 'DOP'],
  ['igp', 'IGP'],
])

export function parseTagId(id: string): { lang: string | null; slug: string } {
  const match = TAG_ID_PATTERN.exec(id)
  if (!match) return { lang: null, slug: id }
  return { lang: match[1]!, slug: match[2]! }
}

/** Fallback display form. Prefer a label upstream hands you. */
export function humanizeTagId(id: string): string {
  const { slug } = parseTagId(id)

  const words = slug
    .split('-')
    .filter(Boolean)
    .map((word) => CASING_OVERRIDES.get(word) ?? word)

  // The raw id reads as an identifier; a half-processed one reads as a label.
  if (words.length === 0) return id

  return words
    .map((word, index) => {
      if (CASING_OVERRIDES.has(word.toLowerCase()) && word !== word.toLowerCase()) return word
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1)
      return word
    })
    .join(' ')
}

/**
 * Brands are the one dimension the index stores unprefixed: categories come
 * back as `en:beverages`, brands as `carrefour`. Autocomplete prefixes
 * everything, so a suggested `en:olivari` matches no product and the filter
 * reads as applied over an empty result.
 */
export function toFilterValue(taxonomy: TaxonomyName, id: string): string {
  return taxonomy === 'brand' ? parseTagId(id).slug : id
}

/**
 * Upstream often echoes the slug back as the label: the brands facet answers
 * `{ key: "lu", name: "lu" }`. A label carrying no more than the id is no label.
 */
export function toTaxonomyTag(id: string, label?: string | null): TaxonomyTag {
  const trimmed = label?.trim()

  if (!trimmed) return { id, label: humanizeTagId(id) }

  const { slug } = parseTagId(id)
  const echoesTheSlug = trimmed.toLowerCase().replace(/[\s_]+/g, '-') === slug.toLowerCase()

  return { id, label: echoesTheSlug ? humanizeTagId(id) : trimmed }
}

/** Category lists run broadest to most specific, so the last is the useful one. */
export function mostSpecificTag(tags: readonly TaxonomyTag[]): TaxonomyTag | null {
  return tags.at(-1) ?? null
}
