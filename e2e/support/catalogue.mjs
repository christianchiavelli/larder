/**
 * The recording the Web Vitals are measured against: what Open Food Facts answered, in
 * `e2e/vitals/catalogue.json`, and the photos those answers name, under `e2e/vitals/photos/`
 * at the paths Open Food Facts serves them from.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

export const PHOTOS = 'https://images.openfoodfacts.org'
export const PHOTO_FILES = new URL('../vitals/photos/', import.meta.url)
export const USER_AGENT = 'Larder/0.1 (+https://github.com/christianchiavelli/larder)'

const FILE = new URL('../vitals/catalogue.json', import.meta.url)
const NAMED_PHOTO = /https:\/\/images\.openfoodfacts\.org(\/images\/[\w./-]+)/g

export function readCatalogue() {
  return JSON.parse(readFileSync(FILE, 'utf8'))
}

/** One answer a line, so a new recording reads as a diff of the requests that changed. */
export function saveCatalogue(catalogue) {
  const answers = Object.entries(catalogue.answers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([request, answer]) => `    ${JSON.stringify(request)}: ${JSON.stringify(answer)}`)
  writeFileSync(
    FILE,
    `{\n  "recorded": ${JSON.stringify(catalogue.recorded)},\n  "answers": {\n${answers.join(',\n')}\n  }\n}\n`,
  )
}

/** The path of every photo the answers name, at every size they name it. */
export function photosNamedIn(catalogue) {
  const text = JSON.stringify(catalogue.answers)
  return [...new Set(Array.from(text.matchAll(NAMED_PHOTO), ([, path]) => path))]
}

/**
 * A photo as it was kept, or, when `fetching`, fetched from Open Food Facts and kept. One it
 * refuses, as it does an old revision the search index still names, is kept as its status alone,
 * among the answers.
 */
export async function photo(catalogue, path, { fetching = false } = {}) {
  const file = new URL(`.${path}`, PHOTO_FILES)
  if (existsSync(file)) return { status: 200, bytes: readFileSync(file) }

  const key = `GET ${path}`
  if (catalogue.answers[key]) return catalogue.answers[key]
  if (!fetching) return null

  const response = await fetch(PHOTOS + path, { headers: { 'user-agent': USER_AGENT } })
  if (!response.ok) {
    catalogue.answers[key] = { status: response.status }
    saveCatalogue(catalogue)
    return catalogue.answers[key]
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  mkdirSync(new URL('.', file), { recursive: true })
  writeFileSync(file, bytes)
  return { status: 200, bytes }
}
