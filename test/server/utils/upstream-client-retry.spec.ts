import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUpstreamClient } from '~~/server/utils/upstream-client'

/**
 * What matters is which failures consume a retry: spending the rate-limit budget
 * three times to receive the same 400 is a self-inflicted outage.
 */

const USER_AGENT = 'Larder/test'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  // Backoff sleeps for real otherwise, and these cases retry twice.
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const client = () => createUpstreamClient('https://upstream.test', USER_AGENT)

describe('createUpstreamClient', () => {
  it('returns the parsed body on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await expect(client().get('/thing')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sends the User-Agent upstream identifies callers by', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))

    await client().get('/thing')

    const request = fetchMock.mock.calls[0]![1] as RequestInit
    expect(new Headers(request.headers).get('user-agent')).toBe(USER_AGENT)
  })

  it('serialises query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))

    await client().get('/search', { q: 'dark chocolate', page: 2 })

    const url = String(fetchMock.mock.calls[0]![0])
    expect(url).toContain('q=dark+chocolate')
    expect(url).toContain('page=2')
  })

  it('retries a 503 and returns the eventual success', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: true }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(client().get('/thing')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a 429, which is transient by definition', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(client().get('/thing')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a network failure, which never reached upstream at all', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(client().get('/thing')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 400: the request is wrong and will stay wrong', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 400))

    await expect(client().get('/thing')).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not retry a 404, which is a real answer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404))

    await expect(client().get('/thing')).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('gives up after the configured number of attempts', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503))

    await expect(client().get('/thing', undefined, { retries: 2 })).rejects.toThrow()

    // One initial attempt plus two retries.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('makes exactly one attempt when retries are disabled', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503))

    await expect(client().get('/thing', undefined, { retries: 0 })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  /**
   * An aborted SSR render must not leave retries running upstream.
   */
  it('stops immediately when the caller aborts, without spending a retry', async () => {
    const controller = new AbortController()

    fetchMock.mockImplementation(() => {
      controller.abort()
      return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    })

    await expect(client().get('/thing', undefined, { signal: controller.signal })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('passes a signal to fetch so an attempt can be cancelled', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))

    await client().get('/thing')

    const request = fetchMock.mock.calls[0]![1] as RequestInit
    expect(request.signal).toBeInstanceOf(AbortSignal)
  })
})
