/**
 * Records what the measured pages ask Open Food Facts, from the live
 * services, into `e2e/vitals/catalogue.json`, which the Web Vitals are then
 * measured against:
 *
 *   pnpm vitals:record
 *
 * Each page is visited once, the way the measurement visits it, so the
 * recording holds exactly the requests a measurement makes. Record again
 * when a page starts asking for something new, and accept the next
 * measurement with `pnpm vitals:accept`: the numbers move with the data.
 */
import { spawnSync } from 'node:child_process'

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

process.exit(status ?? 1)
