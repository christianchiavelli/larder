import { describe, expect, it } from 'vitest'
import { nextSectionIndex } from '~~/layers/ui/app/composables/use-scroll-sections'

const at = (margin: number, ...tops: number[]) =>
  tops.map((top) => ({ top, scrollMarginTop: margin }))

describe('nextSectionIndex', () => {
  it('goes to the first section when the page has not been scrolled', () => {
    expect(nextSectionIndex(at(0, 120, 800, 1600))).toBe(0)
  })

  it('goes past the section already parked at the top', () => {
    expect(nextSectionIndex(at(0, 0, 680, 1480))).toBe(1)
  })

  it('treats a section resting on its own scroll margin as reached', () => {
    expect(nextSectionIndex(at(24, 24, 704))).toBe(1)
  })

  it('does not step past a section that is still short of its margin', () => {
    expect(nextSectionIndex(at(24, 30, 710))).toBe(0)
  })

  it('absorbs a subpixel offset rather than stepping to the same section twice', () => {
    expect(nextSectionIndex(at(24, 24.6, 704))).toBe(1)
  })

  it('reports the end once every section is above the fold', () => {
    expect(nextSectionIndex(at(0, -1400, -600, 0))).toBeNull()
  })

  it('reports the end when there are no sections at all', () => {
    expect(nextSectionIndex([])).toBeNull()
  })

  it('measures each section against its own margin', () => {
    expect(
      nextSectionIndex([
        { top: 48, scrollMarginTop: 48 },
        { top: 60, scrollMarginTop: 24 },
      ]),
    ).toBe(1)
  })
})
