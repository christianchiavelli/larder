import { describe, expect, it } from 'vitest'
import { srcSet } from '~~/layers/ui/app/utils/image'

/**
 * `srcset` construction.
 *
 * Worth testing because every way it can be wrong is invisible. A malformed
 * entry, a duplicated width, an empty attribute: none of them break the layout,
 * and the page renders identically whether the browser picked the 100px file or
 * the 400px one. The only symptom is bandwidth.
 */

describe('srcSet', () => {
  it('pairs each URL with its width', () => {
    expect(
      srcSet([
        { url: 'https://img.example/a.100.jpg', width: 100 },
        { url: 'https://img.example/a.200.jpg', width: 200 },
      ]),
    ).toBe('https://img.example/a.100.jpg 100w, https://img.example/a.200.jpg 200w')
  })

  it('skips a width upstream did not publish', () => {
    expect(
      srcSet([
        { url: null, width: 100 },
        { url: 'https://img.example/a.200.jpg', width: 200 },
      ]),
    ).toBe('https://img.example/a.200.jpg 200w')
  })

  /**
   * An empty `srcset` attribute is not the same as no attribute. Some engines
   * read it as a candidate list containing nothing valid and decline to fall
   * back to `src`, which turns a missing thumbnail into a missing image.
   */
  it('returns undefined rather than an empty string', () => {
    expect(
      srcSet([
        { url: null, width: 100 },
        { url: null, width: 200 },
      ]),
    ).toBeUndefined()
  })

  it('keeps the first of two candidates declared at the same width', () => {
    // Upstream can return the same file for two size fields. Left in, the
    // browser is free to pick either, so the saving becomes a coin toss.
    expect(
      srcSet([
        { url: 'https://img.example/a.200.jpg', width: 200 },
        { url: 'https://img.example/b.200.jpg', width: 200 },
      ]),
    ).toBe('https://img.example/a.200.jpg 200w')
  })
})
