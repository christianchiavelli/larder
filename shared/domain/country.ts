import COUNTRY_NAMES from './country-names.json'
import { DEFAULT_LANGUAGE, type Language } from './language'
import { toTaxonomyTag, type TaxonomyTag } from './taxonomy'

const NAMES: Readonly<Record<Language, Readonly<Record<string, string>>>> = COUNTRY_NAMES

/** A country tag named in the language asked, then in English, then by what upstream sent. */
export function toCountryTag(
  id: string,
  label?: string | null,
  language: Language = DEFAULT_LANGUAGE,
): TaxonomyTag {
  return toTaxonomyTag(id, NAMES[language][id] ?? NAMES.en[id] ?? label)
}
