import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, inlineScriptHashes } from '~~/server/utils/content-security-policy'

// The example the CSP specification itself hashes.
const HELLO = "alert('Hello, world.');"
const HELLO_HASH = "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='"

describe('inlineScriptHashes', () => {
  it('hashes a script the page runs inline, as the specification does', () => {
    expect(inlineScriptHashes(`<script>${HELLO}</script>`)).toEqual([HELLO_HASH])
  })

  it('hashes an import map, which runs under the same rule', () => {
    const page = '<script type="importmap">{"imports":{"#entry":"/_nuxt/a.js"}}</script>'

    expect(inlineScriptHashes(page)).toHaveLength(1)
  })

  it('leaves out a script with a source, and JSON that never runs', () => {
    const page = [
      '<script type="module" src="/_nuxt/entry.js" crossorigin></script>',
      '<script type="application/json" id="__NUXT_DATA__">[1,2]</script>',
      '<script type="application/ld+json">{}</script>',
      '<script></script>',
    ].join('')

    expect(inlineScriptHashes(page)).toEqual([])
  })

  it('tells a source apart from an attribute that only ends in src', () => {
    expect(inlineScriptHashes(`<script data-src="x">${HELLO}</script>`)).toEqual([HELLO_HASH])
  })

  it('lists a script repeated on the page once', () => {
    expect(inlineScriptHashes(`<script>${HELLO}</script><script>${HELLO}</script>`)).toEqual([
      HELLO_HASH,
    ])
  })
})

describe('contentSecurityPolicy', () => {
  const policy = contentSecurityPolicy([HELLO_HASH])
  const directive = (name: string) =>
    policy
      .split('; ')
      .find((entry) => entry.startsWith(`${name} `))
      ?.slice(name.length + 1)

  it('runs the app’s own scripts and the inline ones it hashed, nothing else', () => {
    expect(directive('script-src')).toBe(`'self' ${HELLO_HASH}`)
  })

  it('lets the product photographs in, from Open Food Facts only', () => {
    expect(directive('img-src')).toBe("'self' https://images.openfoodfacts.org")
  })

  it('refuses plugins, framing and a base that would move every link', () => {
    expect(directive('object-src')).toBe("'none'")
    expect(directive('frame-ancestors')).toBe("'none'")
    expect(directive('base-uri')).toBe("'none'")
  })
})
