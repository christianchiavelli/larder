import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'
import {
  appendResponseHeader,
  getRequestHeader,
  getResponseHeader,
  removeResponseHeader,
  setResponseHeader,
  type H3Event,
} from 'h3'

export type ContentEncoding = 'br' | 'gzip'

/** The floor Nitro uses for the built files too: below it, compressing saves next to nothing. */
export const MIN_COMPRESSED_BYTES = 1024

const COMPRESSIBLE =
  /^(?:text\/|application\/(?:json|javascript|xml|[\w.-]+\+(?:json|xml))|image\/svg\+xml)/i

export function isCompressible(contentType: string): boolean {
  return COMPRESSIBLE.test(contentType)
}

/**
 * Which of the two encodings to answer in, by the weights the request gives them, brotli when
 * they tie, as it packs text tighter. Null when the request accepts neither.
 */
export function negotiateEncoding(acceptEncoding: string | undefined): ContentEncoding | null {
  if (!acceptEncoding) return null

  const weights = new Map<string, number>()
  for (const entry of acceptEncoding.split(',')) {
    const [name = '', ...params] = entry.split(';').map((part) => part.trim().toLowerCase())
    if (!name) continue
    const q = params.find((param) => param.startsWith('q='))
    const weight = q === undefined ? 1 : Number(q.slice(2))
    weights.set(name, Number.isFinite(weight) ? weight : 0)
  }

  const weightOf = (encoding: ContentEncoding) => weights.get(encoding) ?? weights.get('*') ?? 0
  const br = weightOf('br')
  const gz = weightOf('gzip')

  if (br > 0 && br >= gz) return 'br'
  return gz > 0 ? 'gzip' : null
}

const brotli = promisify(brotliCompress)
const gzipped = promisify(gzip)

function compress(text: string, encoding: ContentEncoding): Promise<Buffer> {
  const input = Buffer.from(text)
  if (encoding === 'gzip') return gzipped(input)

  return brotli(input, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      // The default, 11, is for files packed once at build time and takes a hundred
      // milliseconds on a page; 5 takes one or two and gives up about a tenth of the saving.
      [constants.BROTLI_PARAM_QUALITY]: 5,
      [constants.BROTLI_PARAM_SIZE_HINT]: input.length,
    },
  })
}

function isPlainJson(value: unknown): value is object {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value)
  return Array.isArray(value) || prototype === Object.prototype || prototype === null
}

/**
 * Compresses a response on its way out, for Nitro's `beforeResponse` hook: a page as the
 * renderer wrote it, or an answer h3 would write as JSON. Streams and bytes, encoded or not,
 * go out as they are; the built files come compressed from the build.
 */
export async function compressResponse(event: H3Event, response: { body?: unknown }) {
  const { body } = response
  const text = typeof body === 'string' ? body : isPlainJson(body) ? JSON.stringify(body) : null
  if (text === null || Buffer.byteLength(text) < MIN_COMPRESSED_BYTES) return

  // Nuxt renders its error page through a request of its own that carries this one's
  // headers, and copies what comes back as text, so that one has to stay plain.
  if (getRequestHeader(event, 'x-nuxt-error')) return

  const contentType = String(
    getResponseHeader(event, 'content-type') ??
      (typeof body === 'string' ? 'text/html' : 'application/json'),
  )
  if (!isCompressible(contentType)) return

  appendResponseHeader(event, 'vary', 'Accept-Encoding')

  const encoding = negotiateEncoding(getRequestHeader(event, 'accept-encoding'))
  if (!encoding) return

  const compressed = await compress(text, encoding)

  // h3 names the type of a string or an object it sends, but not of bytes.
  setResponseHeader(event, 'content-type', contentType)
  setResponseHeader(event, 'content-encoding', encoding)
  removeResponseHeader(event, 'content-length')
  response.body = compressed
}
