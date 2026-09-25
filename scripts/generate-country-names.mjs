import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://static.openfoodfacts.org/data/taxonomies/countries.json'
const OUT_FILE = 'shared/domain/country-names.json'
const USER_AGENT = 'Larder/0.1 (+https://github.com/christianchiavelli/larder)'

const response = await fetch(SOURCE, { headers: { 'User-Agent': USER_AGENT } })

if (!response.ok) {
  throw new Error(`${SOURCE} answered ${response.status}`)
}

const taxonomy = await response.json()

const names = Object.fromEntries(
  Object.entries(taxonomy)
    .map(([id, entry]) => [id, entry?.name?.en?.trim()])
    .filter(([id, name]) => id.startsWith('en:') && name)
    .sort(([a], [b]) => a.localeCompare(b, 'en')),
)

await writeFile(OUT_FILE, `${JSON.stringify(names, null, 2)}\n`)
console.log(`wrote ${Object.keys(names).length} country names to ${OUT_FILE}`)
