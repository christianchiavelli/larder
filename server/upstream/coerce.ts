import { z } from 'zod'

/**
 * The same field arrives as a number from one record and its string spelling
 * from the next, so coercion happens once, here.
 *
 * `.nullish()` is load-bearing: upstream omits a key entirely when it has no
 * value, and in Zod 4 a union merely including `z.undefined()` still requires the
 * key. Without it most of the catalogue fails to parse.
 */

/** A number, the numeric string of a number, or any of the empty cases. */
export const looseNumber = z
  .union([z.number(), z.string(), z.null()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    // JSON has no NaN or Infinity literal, so a bad record spells them as
    // strings. Neither can be rendered or averaged, so both are absences.
    return Number.isFinite(parsed) ? parsed : null
  })

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

/**
 * Some records were escaped on the way in, so a value reads `&lt;2 mg/l` where
 * the bottle says `<`.
 *
 * One pass, never a chain: decoding `&amp;` first would turn a legitimately
 * escaped `&amp;lt;` into a `<` nobody wrote.
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
      // Lone surrogates and out-of-range values throw rather than returning a
      // replacement character, and a malformed entity is better left as typed.
      return Number.isInteger(code) &&
        code >= 0 &&
        code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : match
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** A string, or a number that was meant to be one. Blank reads as absent. */
export const looseString = z
  .union([z.string(), z.number(), z.null()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined ? null : decodeEntities(String(value)).trim() || null,
  )
