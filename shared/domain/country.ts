import COUNTRY_NAMES from './country-names.json'
import { toTaxonomyTag, type TaxonomyTag } from './taxonomy'

const NAMES: Readonly<Record<string, string>> = COUNTRY_NAMES

export function toCountryTag(id: string, label?: string | null): TaxonomyTag {
  return toTaxonomyTag(id, NAMES[id] ?? label)
}
