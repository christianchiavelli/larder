import { describe, expect, it } from 'vitest'
import { srcSet } from '~~/layers/ui/app/utils/image'

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

  it('returns undefined rather than an empty string', () => {
    expect(
      srcSet([
        { url: null, width: 100 },
        { url: null, width: 200 },
      ]),
    ).toBeUndefined()
  })

  it('keeps the first of two candidates declared at the same width', () => {
    expect(
      srcSet([
        { url: 'https://img.example/a.200.jpg', width: 200 },
        { url: 'https://img.example/b.200.jpg', width: 200 },
      ]),
    ).toBe('https://img.example/a.200.jpg 200w')
  })
})
