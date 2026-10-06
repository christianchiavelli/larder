import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://static.openfoodfacts.org/data/taxonomies/countries.json'
const OUT_FILE = 'shared/domain/country-names.json'
const USER_AGENT = 'Larder/0.1 (+https://github.com/christianchiavelli/larder)'

/**
 * Region codes for the tags the taxonomy leaves without one, where CLDR still names the
 * place. The taxonomy's own "world" is not a code at all; 001 is CLDR's for it. AQ is
 * already the code of "Antarctic", so "Antarctica" keeps the taxonomy's own name.
 */
const REGION_CODES = {
  'en:world': '001',
  'en:ascension-island': 'AC',
  'en:european-union': 'EU',
  'en:palestinian-territories': 'PS',
}

/**
 * Portuguese names decided by hand, where CLDR's would misname the tag: it folds the
 * retired YU into Serbia, gives the State of Palestine the name of the territories, and
 * writes the rest in a form too long or too formal for a filter chip.
 */
const PORTUGUESE_NAMES = {
  'en:democratic-republic-of-the-congo': 'República Democrática do Congo',
  'en:hong-kong': 'Hong Kong',
  'en:macau': 'Macau',
  'en:myanmar': 'Mianmar',
  'en:state-of-palestine': 'Palestina',
  'en:yugoslavia': 'Iugoslávia',
}

const response = await fetch(SOURCE, { headers: { 'User-Agent': USER_AGENT } })

if (!response.ok) {
  throw new Error(`${SOURCE} answered ${response.status}`)
}

const taxonomy = await response.json()

// The taxonomy's Portuguese is European, so Brazilian names come from CLDR, by the
// ISO code the taxonomy keeps for nearly every country. The taxonomy writes the
// United Kingdom as UK, which ISO reserves for it; CLDR knows it as GB.
const regions = new Intl.DisplayNames(['pt-BR'], { type: 'region', fallback: 'none' })

function regionCode(id, entry) {
  const code = REGION_CODES[id] ?? entry?.country_code_2?.en?.trim().toUpperCase()
  if (!code || !/^([A-Z]{2}|\d{3})$/.test(code)) return null
  const canonical = Intl.getCanonicalLocales(`und-${code}`)[0].slice('und-'.length)
  // A retired code would be named after the country that took it over.
  return canonical === code || code === 'UK' ? canonical : null
}

function portugueseName(id, entry) {
  if (PORTUGUESE_NAMES[id]) return PORTUGUESE_NAMES[id]
  const code = regionCode(id, entry)
  return (code && regions.of(code)) || entry?.name?.pt?.trim()
}

function namesIn(name) {
  return Object.fromEntries(
    Object.entries(taxonomy)
      .filter(([id]) => id.startsWith('en:'))
      .map(([id, entry]) => [id, name(id, entry)])
      .filter(([, value]) => value)
      .sort(([a], [b]) => a.localeCompare(b, 'en')),
  )
}

const names = {
  en: namesIn((_id, entry) => entry?.name?.en?.trim()),
  pt: namesIn(portugueseName),
}

await writeFile(OUT_FILE, `${JSON.stringify(names, null, 2)}\n`)
console.log(
  `wrote ${Object.keys(names.en).length} English and ${Object.keys(names.pt).length} Portuguese country names to ${OUT_FILE}`,
)
