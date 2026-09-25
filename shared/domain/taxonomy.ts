import { z } from 'zod'

export const TAXONOMIES = ['category', 'brand', 'label', 'country', 'additive'] as const
export type TaxonomyName = (typeof TAXONOMIES)[number]

export const taxonomyTagSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export type TaxonomyTag = z.infer<typeof taxonomyTagSchema>

const TAG_ID_PATTERN = /^([a-z]{2,3}):(.*)$/

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

export function humanizeTagId(id: string): string {
  const { slug } = parseTagId(id)

  const words = slug
    .split('-')
    .filter(Boolean)
    .map((word) => CASING_OVERRIDES.get(word) ?? word)

  if (words.length === 0) return id

  return words
    .map((word, index) => {
      if (CASING_OVERRIDES.has(word.toLowerCase()) && word !== word.toLowerCase()) return word
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1)
      return word
    })
    .join(' ')
}

export function toFilterValue(taxonomy: TaxonomyName, id: string): string {
  return taxonomy === 'brand' ? parseTagId(id).slug : id
}

export function toTaxonomyTag(id: string, label?: string | null): TaxonomyTag {
  const trimmed = label?.trim()

  if (!trimmed) return { id, label: humanizeTagId(id) }

  const { slug } = parseTagId(id)
  const echoesTheSlug = trimmed.toLowerCase().replace(/[\s_]+/g, '-') === slug.toLowerCase()
  const carriesNoCasing = trimmed === trimmed.toLowerCase()

  return { id, label: echoesTheSlug && carriesNoCasing ? humanizeTagId(id) : trimmed }
}

export function mostSpecificTag(tags: readonly TaxonomyTag[]): TaxonomyTag | null {
  return tags.at(-1) ?? null
}
