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
    // NaN and Infinity both reach here from real records. Neither can be
    // rendered or averaged, so they are absences, not values.
    return Number.isFinite(parsed) ? parsed : null
  })

/** A string, or a number that was meant to be one. Blank reads as absent. */
export const looseString = z
  .union([z.string(), z.number(), z.null()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined ? null : String(value).trim() || null,
  )
