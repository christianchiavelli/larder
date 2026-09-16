import { describe, expect, it } from 'vitest'
import { looseNumber, looseString } from '~~/server/upstream/coerce'

/**
 * The lenient readers at the upstream boundary.
 *
 * Open Food Facts is edited through several clients over a long history, so the
 * same field arrives typed differently from one record to the next, and some of
 * it arrives escaped.
 */

describe('looseString', () => {
  it.each([
    ['plain text', 'Nutella', 'Nutella'],
    ['a number that was meant to be text', 400, '400'],
    ['whitespace', '  Nutella  ', 'Nutella'],
  ])('reads %s', (_label, input, expected) => {
    expect(looseString.parse(input)).toBe(expected)
  })

  it.each([[null], [undefined], ['']])('reads %s as absent', (input) => {
    expect(looseString.parse(input)).toBeNull()
  })

  /**
   * A mineral water lists "Nitrates NO3 - &lt;2 mg/l". The value is text and Vue
   * escapes text, so the reader saw those six characters where the bottle says
   * `<`. Nothing failed anywhere.
   */
  it.each([
    ['&lt;2 mg/l', '<2 mg/l'],
    ['Salt &amp; pepper', 'Salt & pepper'],
    ['&quot;Bio&quot;', '"Bio"'],
    ['L&apos;Original', "L'Original"],
    ['caf&#233;', 'café'],
    ['caf&#xe9;', 'café'],
  ])('decodes %s', (input, expected) => {
    expect(looseString.parse(input)).toBe(expected)
  })

  it('decodes a non-breaking space, which then trims like a space', () => {
    expect(looseString.parse('400&nbsp;g')).toBe('400 g')
  })

  /**
   * One pass, not a chain. Decoding `&amp;` and then running again would turn
   * text that legitimately reads `&lt;` into a `<` nobody wrote.
   */
  it('does not decode twice', () => {
    expect(looseString.parse('&amp;lt;2')).toBe('&lt;2')
  })

  it.each([['100% &bogus; entity'], ['AT&T'], ['a & b'], ['&#xZZ;']])(
    'leaves %s alone',
    (input) => {
      expect(looseString.parse(input)).toBe(input)
    },
  )

  it('leaves a code point outside Unicode alone rather than throwing', () => {
    expect(looseString.parse('&#1114112;')).toBe('&#1114112;')
  })
})

describe('looseNumber', () => {
  it.each([
    [12.5, 12.5],
    ['12.5', 12.5],
    [0, 0],
  ])('reads %s', (input, expected) => {
    expect(looseNumber.parse(input)).toBe(expected)
  })

  /**
   * JSON carries no NaN or Infinity literal, so what actually arrives from a
   * bad record is the string spelling of one.
   */
  it.each([[null], [undefined], [''], ['banana'], ['NaN'], ['Infinity']])(
    'reads %s as absent',
    (input) => {
      expect(looseNumber.parse(input)).toBeNull()
    },
  )
})
