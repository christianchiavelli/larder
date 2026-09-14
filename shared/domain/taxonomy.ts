import { z } from 'zod'

/**
 * Open Food Facts organises categories, labels, countries and additives as
 * taxonomies: controlled vocabularies whose entries are language-prefixed ids
 * such as `en:sweet-spreads`.
 *
 * The prefix names the language the canonical term was authored in, not the
 * language you get back. It is part of the identity of the entry, so it is
 * never stripped for lookups, filtering, or URLs. It is stripped only when a
 * human has to read the thing.
 */

export const TAXONOMIES = ['category', 'brand', 'label', 'country', 'additive'] as const
export type TaxonomyName = (typeof TAXONOMIES)[number]

export const taxonomyTagSchema = z.object({
  /** Canonical, language-prefixed id. Stable, used as the filter value. */
  id: z.string().min(1),
  /** Display form. Derived from the id unless upstream gave us a better one. */
  label: z.string().min(1),
})

export type TaxonomyTag = z.infer<typeof taxonomyTagSchema>

// The slug half is `.*` rather than `.+` so that a prefix with nothing after it
// parses as an empty slug instead of failing to match and being mistaken for an
// unprefixed id. `en:` is malformed either way, but only one of those readings
// lets the caller notice.
const TAG_ID_PATTERN = /^([a-z]{2,3}):(.*)$/

/**
 * Words that upstream taxonomies keep in a fixed casing. Title-casing them from
 * a slug would produce "Pdo" and "Fr Bio01", which look like bugs to anyone
 * who knows the labels.
 */
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

/** Splits `en:sweet-spreads` into its language and slug halves. */
export function parseTagId(id: string): { lang: string | null; slug: string } {
  const match = TAG_ID_PATTERN.exec(id)
  if (!match) return { lang: null, slug: id }
  return { lang: match[1]!, slug: match[2]! }
}

/**
 * Best-effort display form for a taxonomy id.
 *
 * Upstream does return translated names on some endpoints and not others, so
 * this is the fallback rather than the primary path. Prefer a label upstream
 * hands you; use this when it does not.
 */
export function humanizeTagId(id: string): string {
  const { slug } = parseTagId(id)

  const words = slug
    .split('-')
    .filter(Boolean)
    .map((word) => CASING_OVERRIDES.get(word) ?? word)

  // Nothing to work with. Returning the raw id is the honest outcome: it is
  // visibly an identifier, where a half-processed one would read as a label and
  // hide the fact that this entry is malformed.
  if (words.length === 0) return id

  return words
    .map((word, index) => {
      // An override already carries its intended casing.
      if (CASING_OVERRIDES.has(word.toLowerCase()) && word !== word.toLowerCase()) return word
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1)
      return word
    })
    .join(' ')
}

/**
 * Builds a tag from an id, preferring a label upstream supplied.
 *
 * Upstream often "supplies" a label that is just the slug echoed back: the
 * brands facet answers `{ key: "lu", name: "lu" }`. Taking that literally would
 * print lowercase slugs down the filter panel next to properly cased entries
 * from other dimensions. So a label that carries no more information than the
 * id does is treated as no label at all.
 */
export function toTaxonomyTag(id: string, label?: string | null): TaxonomyTag {
  const trimmed = label?.trim()

  if (!trimmed) return { id, label: humanizeTagId(id) }

  const { slug } = parseTagId(id)
  const echoesTheSlug = trimmed.toLowerCase().replace(/[\s_]+/g, '-') === slug.toLowerCase()

  return { id, label: echoesTheSlug ? humanizeTagId(id) : trimmed }
}

/**
 * Category lists arrive ordered from broadest to most specific
 * (`en:breakfasts` then `en:spreads` then `en:sweet-spreads`). The last entry is
 * the one worth showing when there is room for exactly one.
 */
export function mostSpecificTag(tags: readonly TaxonomyTag[]): TaxonomyTag | null {
  return tags.at(-1) ?? null
}
