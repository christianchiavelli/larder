import { describe, expect, it } from 'vitest'
import {
  accessRecord,
  failureRecord,
  failureStatus,
  isWorthLogging,
  loggedPath,
} from '~~/server/utils/access-log'

describe('isWorthLogging', () => {
  it.each([['/'], ['/products'], ['/api/products'], ['/api/products/3017620425035'], ['/pt']])(
    'keeps %s, which somebody asked for',
    (path) => {
      expect(isWorthLogging(path)).toBe(true)
    },
  )

  it.each([['/_nuxt/entry.js'], ['/_fonts/lora.woff2'], ['/favicon.ico']])(
    'drops %s, which is the build talking to itself',
    (path) => {
      expect(isWorthLogging(path)).toBe(false)
    },
  )

  it('drops the route a failure is rendered through, so it is not reported twice', () => {
    expect(isWorthLogging('/__nuxt_error')).toBe(false)
  })
})

describe('loggedPath', () => {
  it('drops the query, so a reader never has their search terms written down', () => {
    expect(loggedPath('/api/products?q=chocolate&page=2')).toBe('/api/products')
  })

  it('keeps a bare root', () => {
    expect(loggedPath('/')).toBe('/')
  })

  it('drops a trailing slash, so one route is one line to count', () => {
    expect(loggedPath('/products/')).toBe('/products')
  })

  it('keeps a path that has no query at all', () => {
    expect(loggedPath('/pt/products')).toBe('/pt/products')
  })
})

describe('accessRecord', () => {
  it('writes one line, with what a reader of the log needs and nothing else', () => {
    const line = accessRecord({
      requestId: 'a3f1',
      method: 'GET',
      path: '/api/products',
      status: 200,
      durationMs: 12.7,
    })

    expect(line).not.toContain('\n')
    expect(JSON.parse(line)).toEqual({
      level: 'info',
      msg: 'request',
      requestId: 'a3f1',
      method: 'GET',
      path: '/api/products',
      status: 200,
      durationMs: 13,
    })
  })

  it('survives a malformed request id without breaking the line', () => {
    const line = accessRecord({
      requestId: 'a"b\nc',
      method: 'GET',
      path: '/',
      status: 500,
      durationMs: 0,
    })

    expect(line).not.toContain('\n')
    expect(JSON.parse(line).requestId).toBe('a"b\nc')
  })
})

describe('failureRecord', () => {
  it('names the request that failed, at the status it failed with', () => {
    const line = failureRecord({
      requestId: 'a3f1',
      method: 'GET',
      path: '/products/00000000000001',
      status: 404,
    })

    expect(line).not.toContain('\n')
    expect(JSON.parse(line)).toEqual({
      level: 'error',
      msg: 'request-failed',
      requestId: 'a3f1',
      method: 'GET',
      path: '/products/00000000000001',
      status: 404,
    })
  })
})

describe('failureStatus', () => {
  it.each([
    ['an h3 error', { statusCode: 404 }, 404],
    ['a fetch error that carries a status', { status: 502 }, 502],
    ['one that nests the status under the response', { response: { status: 503 } }, 503],
    ['something that says nothing at all', new Error('boom'), 500],
    ['a throw that is not an object', 'boom', 500],
    ['a throw of nothing', null, 500],
  ])('reads %s as %i', (_, error, expected) => {
    expect(failureStatus(error)).toBe(expected)
  })
})
