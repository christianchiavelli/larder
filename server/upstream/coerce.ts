import { z } from 'zod'

/**
 * Lenient readers for upstream's field types.
 *
 * Open Food Facts is community-edited through several clients and a long
 * history of import scripts, so the same field arrives as a number from one
 * record and the string spelling of that number from the next. Neither is
 * wrong upstream and neither should reach the domain, so the coercion happens
 * once, here, at the boundary.
 *
 * `.nullish()` on every one of them is load-bearing. Upstream omits a key
 * entirely when it has no value, and in Zod 4 a union that merely includes
 * `z.undefined()` still requires the key to be present: without this, every
 * record missing any optional field is rejected, which is most of the
 * catalogue. That is not hypothetical, it shipped, and the directory rendered
 * empty while reporting ten thousand matches.
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
 * Upstream text arrives with HTML entities still in it.
 *
 * Records are edited through several clients over a long history, and some of
 * them escaped on the way in: a mineral water lists "Nitrates NO3 - &lt;2 mg/l",
 * which renders as those six characters because the value is text and Vue
 * escapes text. Nothing fails; the reader simply sees `&lt;` where the label on
 * the bottle says `<`.
 *
 * One pass, never a chain of replacements. Decoding `&amp;` first would turn
 * the legitimately escaped `&amp;lt;` into `<` on a second pass.
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
