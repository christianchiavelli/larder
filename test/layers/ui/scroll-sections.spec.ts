import { describe, expect, it } from 'vitest'
import { nextSectionIndex } from '~~/layers/ui/app/composables/use-scroll-sections'

/**
 * Which section the page steps to next, decided from where each one sits.
 *
 * The rule has to survive the section it just scrolled to: `scrollIntoView`
 * leaves that one parked at its own `scroll-margin-top`, not at zero, so a
 * comparison against the raw offset picks the same section forever and the
 * button stops doing anything.
 */

/** Sections at the given offsets, each keeping the same margin. */
const at = (margin: number, ...tops: number[]) =>
  tops.map((top) => ({ top, scrollMarginTop: margin }))

describe('nextSectionIndex', () => {
  it('goes to the first section when the page has not been scrolled', () => {
    expect(nextSectionIndex(at(0, 120, 800, 1600))).toBe(0)
  })

  it('goes past the section already parked at the top', () => {
    expect(nextSectionIndex(at(0, 0, 680, 1480))).toBe(1)
  })

  /**
   * The case a fixed tolerance gets wrong. A section scrolled to with
   * `scroll-mt-6` sits at 24px, which a tolerance under 24 reads as "still
   * below the fold" and steps to again.
   */
  it('treats a section resting on its own scroll margin as reached', () => {
    expect(nextSectionIndex(at(24, 24, 704))).toBe(1)
  })

  it('does not step past a section that is still short of its margin', () => {
    expect(nextSectionIndex(at(24, 30, 710))).toBe(0)
  })

  /**
   * A section within a pixel of parked counts as reached. Fractional layout is
   * routine at a non-integer device pixel ratio, and without the tolerance the
   * button lands on the same section twice at 125% zoom.
   */
  it('absorbs a subpixel offset rather than stepping to the same section twice', () => {
    expect(nextSectionIndex(at(24, 24.6, 704))).toBe(1)
  })

  it('reports the end once every section is above the fold', () => {
    expect(nextSectionIndex(at(0, -1400, -600, 0))).toBeNull()
  })

  it('reports the end when there are no sections at all', () => {
    // Every page shares one layout, and not every page marks sections.
    expect(nextSectionIndex([])).toBeNull()
  })

  /**
   * Sections can carry different margins: a full-width row and a card inside
   * it do not have to agree, so each is measured against its own.
   */
  it('measures each section against its own margin', () => {
    expect(
      nextSectionIndex([
        { top: 48, scrollMarginTop: 48 },
        { top: 60, scrollMarginTop: 24 },
      ]),
    ).toBe(1)
  })
})
