/**
 * Records what the measured pages ask Open Food Facts, from the live
 * services, into `e2e/vitals/catalogue.json`, which the Web Vitals are then
 * measured against:
 *
 *   pnpm vitals:record
 *
 * Each page is visited once, the way the measurement visits it, so the
 * recording holds exactly the requests a measurement makes. Every photo the
 * answers name is kept too, under `e2e/vitals/photos/`, rather than only those
 * the visits loaded: which ones a page gets to before it is left depends on
 * timing, and a measurement must never ask for one the recording lacks.
 * Record again when a page starts asking for something new, and accept the
 * next measurement with `pnpm vitals:accept`: the numbers move with the data.
 */
import { spawnSync } from 'node:child_process'
import { photo, photosNamedIn, readCatalogue } from '../e2e/support/catalogue.mjs'

const { status } = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '--config', 'playwright.vitals.config.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, VITALS_RECORD: '1' },
    // pnpm is a script on Windows, which only a shell runs.
    shell: process.platform === 'win32',
  },
)
if (status !== 0) process.exit(status ?? 1)

const catalogue = readCatalogue()
const paths = photosNamedIn(catalogue)
const named = paths.length

// A few at a time, as a page would ask for them.
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let path = paths.shift(); path; path = paths.shift()) {
      await photo(catalogue, path, { fetching: true })
    }
  }),
)

const refused = Object.keys(catalogue.answers).filter((key) => key.startsWith('GET /images/'))
console.log(`Kept the ${named} photos the answers name, ${refused.length} of them refused.`)
