import { createServer, get, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, eventHandler, setResponseHeader, toNodeListener, type EventHandler } from 'h3'
import {
  MIN_COMPRESSED_BYTES,
  compressResponse,
  isCompressible,
  negotiateEncoding,
} from '~~/server/utils/compression'

const PAGE = `<!doctype html><p>${'Hazelnut spread with cocoa. '.repeat(100)}</p>`
const ANSWER = {
  items: Array.from({ length: 40 }, (_, index) => ({ code: String(index), name: 'Nutella' })),
}

let server: Server | undefined

/** Serves `handler` as Nitro does: from an h3 app that calls the hook before it sends. */
async function serve(handler: EventHandler): Promise<string> {
  const app = createApp({ onBeforeResponse: compressResponse })
  app.use(handler)
  server = createServer(toNodeListener(app))
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

/** Fetches without decoding, to see the bytes as they travel. */
function request(url: string, headers: Record<string, string> = {}) {
  return new Promise<{ headers: IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    get(url, { headers }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolve({ headers: response.headers, body: Buffer.concat(chunks) }))
      response.on('error', reject)
    }).on('error', reject)
  })
}

afterEach(async () => {
  server?.closeAllConnections()
  await new Promise((resolve) => server?.close(resolve) ?? resolve(undefined))
  server = undefined
})

describe('negotiateEncoding', () => {
  it('picks brotli from what every browser sends', () => {
    expect(negotiateEncoding('gzip, deflate, br, zstd')).toBe('br')
  })

  it('falls back to gzip', () => {
    expect(negotiateEncoding('gzip, deflate')).toBe('gzip')
  })

  it('follows the weights the request gives', () => {
    expect(negotiateEncoding('br;q=0.5, gzip')).toBe('gzip')
    expect(negotiateEncoding('br;q=1.0, gzip;q=0.8')).toBe('br')
  })

  it('never picks an encoding the request refuses', () => {
    expect(negotiateEncoding('br;q=0, gzip;q=0')).toBeNull()
    expect(negotiateEncoding('br;q=0, *')).toBe('gzip')
    expect(negotiateEncoding('*;q=0')).toBeNull()
  })

  it('reads a wildcard, any case and loose spacing', () => {
    expect(negotiateEncoding('*')).toBe('br')
    expect(negotiateEncoding(' GZIP ; Q=1 , ')).toBe('gzip')
  })

  it('finds nothing in a header that names nothing it can use', () => {
    expect(negotiateEncoding(undefined)).toBeNull()
    expect(negotiateEncoding('')).toBeNull()
    expect(negotiateEncoding('identity, deflate')).toBeNull()
    expect(negotiateEncoding('br;q=nonsense')).toBeNull()
  })
})

describe('isCompressible', () => {
  it('takes text, JSON, scripts and SVG', () => {
    for (const type of [
      'text/html;charset=utf-8',
      'text/csv',
      'application/json',
      'application/manifest+json',
      'application/javascript',
      'image/svg+xml',
    ]) {
      expect(isCompressible(type), type).toBe(true)
    }
  })

  it('leaves formats that are compressed already', () => {
    for (const type of ['image/png', 'image/webp', 'font/woff2', 'application/zip']) {
      expect(isCompressible(type), type).toBe(false)
    }
  })
})

describe('compressResponse', () => {
  it('sends a page in brotli, typed, and says it varies by what the browser accepts', async () => {
    const url = await serve(
      eventHandler((event) => {
        setResponseHeader(event, 'content-type', 'text/html;charset=utf-8')
        return PAGE
      }),
    )

    const { headers, body } = await request(url, { 'accept-encoding': 'gzip, deflate, br' })

    expect(headers['content-encoding']).toBe('br')
    expect(headers['content-type']).toBe('text/html;charset=utf-8')
    expect(headers.vary).toBe('Accept-Encoding')
    expect(body.length).toBeLessThan(PAGE.length / 10)
    expect(brotliDecompressSync(body).toString()).toBe(PAGE)
  })

  it('types a bare string as a page, as h3 would', async () => {
    const url = await serve(eventHandler(() => PAGE))

    const { headers } = await request(url, { 'accept-encoding': 'br' })

    expect(headers['content-type']).toBe('text/html')
  })

  it('writes an answer as JSON, as h3 would, before it packs it', async () => {
    const url = await serve(eventHandler(() => ANSWER))

    const { headers, body } = await request(url, { 'accept-encoding': 'gzip' })

    expect(headers['content-encoding']).toBe('gzip')
    expect(headers['content-type']).toBe('application/json')
    expect(JSON.parse(gunzipSync(body).toString())).toEqual(ANSWER)
  })

  it('sends plain text to a client that accepts no encoding, still marked as varying', async () => {
    const url = await serve(eventHandler(() => ANSWER))

    const { headers, body } = await request(url)

    expect(headers['content-encoding']).toBeUndefined()
    expect(headers.vary).toBe('Accept-Encoding')
    expect(JSON.parse(body.toString())).toEqual(ANSWER)
  })

  it('leaves an answer under the floor plain', async () => {
    const small = 'x'.repeat(MIN_COMPRESSED_BYTES - 1)
    const url = await serve(eventHandler(() => small))

    const { headers, body } = await request(url, { 'accept-encoding': 'br' })

    expect(headers['content-encoding']).toBeUndefined()
    expect(headers.vary).toBeUndefined()
    expect(body.toString()).toBe(small)
  })

  it('leaves plain the error page Nuxt renders for itself and reads back as text', async () => {
    const url = await serve(eventHandler(() => PAGE))

    const { headers, body } = await request(url, {
      'accept-encoding': 'br',
      'x-nuxt-error': 'true',
    })

    expect(headers['content-encoding']).toBeUndefined()
    expect(body.toString()).toBe(PAGE)
  })

  it('leaves a type that does not compress as it is', async () => {
    const url = await serve(
      eventHandler((event) => {
        setResponseHeader(event, 'content-type', 'application/octet-stream')
        return PAGE
      }),
    )

    const { headers } = await request(url, { 'accept-encoding': 'br' })

    expect(headers['content-encoding']).toBeUndefined()
    expect(headers.vary).toBeUndefined()
  })

  it.each([
    ['a stream', () => Readable.from([PAGE])],
    ['bytes', () => Buffer.from(PAGE)],
  ])('lets %s go out as it is', async (_, send) => {
    const url = await serve(eventHandler(send))

    const { headers, body } = await request(url, { 'accept-encoding': 'br' })

    expect(headers['content-encoding']).toBeUndefined()
    expect(body.toString()).toBe(PAGE)
  })
})
