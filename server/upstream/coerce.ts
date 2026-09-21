import { z } from 'zod'

export const looseNumber = z
  .union([z.number(), z.string(), z.null()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
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

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
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

export const looseString = z
  .union([z.string(), z.number(), z.null()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined ? null : decodeEntities(String(value)).trim() || null,
  )
