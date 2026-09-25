import { describe, expect, it } from 'vitest'
import { FULL_DATASET_URL, exportVerdict } from '#shared/domain/export'
import { MAX_TRACKED_HITS } from '#shared/domain/search'

describe('exportVerdict', () => {
  it('is ready when every match fits in one file', () => {
    expect(exportVerdict({ totalCount: 8_958, isTotalExact: true })).toBe('ready')
  })

  it('is ready right at the limit, since the upstream pages to exactly that row', () => {
    expect(exportVerdict({ totalCount: MAX_TRACKED_HITS, isTotalExact: true })).toBe('ready')
  })

  it('is too many once the upstream stops counting', () => {
    expect(exportVerdict({ totalCount: MAX_TRACKED_HITS, isTotalExact: false })).toBe('too-many')
  })

  it('is too many for an exact count past the limit, should the upstream ever count further', () => {
    expect(exportVerdict({ totalCount: MAX_TRACKED_HITS + 1, isTotalExact: true })).toBe('too-many')
  })

  it('is empty when nothing matches', () => {
    expect(exportVerdict({ totalCount: 0, isTotalExact: true })).toBe('empty')
  })
})

describe('FULL_DATASET_URL', () => {
  it('points at the page Open Food Facts publishes its full exports on', () => {
    expect(new URL(FULL_DATASET_URL).href).toBe('https://world.openfoodfacts.org/data')
  })
})
